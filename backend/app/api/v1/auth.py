"""Auth endpoints: signup, login (+lockout & session audit), logout,
password reset, email recovery, change password (Phase 1 + security pass)."""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.rate_limit import login_rate_limiter
from app.core.security import (
    create_access_token,
    failed_login_tracker,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    mask_email,
    verify_password,
)
from app.db.session import get_db
from app.models.auth_security import PasswordResetToken, UserSession
from app.models.user import Locality, User
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    PhoneVerifyRequest,
    RecoverEmailRequest,
    RecoverEmailResponse,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def _record_session(db: AsyncSession, user_id: uuid.UUID, request: Request) -> UserSession:
    session = UserSession(
        user_id=user_id,
        ip=request.client.host if request.client else None,
        user_agent=(request.headers.get("user-agent") or "")[:300] or None,
    )
    db.add(session)
    await db.flush()
    return session


def _token_response(user: User, session_id: str | None = None) -> TokenResponse:
    token = create_access_token(user.id, token_version=int(user.token_version or 0))
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
        session_id=str(session_id) if session_id else None,
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    locality = await db.get(Locality, payload.locality_id)
    if locality is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown locality")

    user = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        locality_id=payload.locality_id,
    )
    db.add(user)
    await db.flush()
    session = await _record_session(db, user.id, request)
    await db.commit()
    await db.refresh(user)
    return _token_response(user, session.id)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    _: None = Depends(login_rate_limiter),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    if await failed_login_tracker.locked(payload.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many failed attempts. Try again in "
                f"{settings.LOGIN_LOCKOUT_MINUTES} minutes."
            ),
        )

    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        await failed_login_tracker.record_failure(payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    await failed_login_tracker.clear(payload.email)
    session = await _record_session(db, user.id, request)
    await db.commit()
    return _token_response(user, session.id)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Secure logout: bump the token version so every issued JWT is dead.\n\n    This also signs the user out on any other devices — the desired behaviour\n    for a shared-account privacy default.\n    """
    user.token_version = int(user.token_version or 0) + 1
    await db.commit()
    return {"ok": True}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    """Request a password reset link.

    Dev behaviour (no email provider wired): the one-time reset token/link is
    returned in the response so local testing works end-to-end. In production
    the token is emailed instead and never returned — fail-closed until an
    email provider is configured (same pattern as phone OTP).
    """
    ttl_min = settings.PASSWORD_RESET_TTL_MINUTES
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        # Never reveal whether an email exists.
        return ForgotPasswordResponse(sent=True, expires_min=ttl_min)

    token = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=ttl_min),
        )
    )
    await db.commit()

    if settings.APP_ENV == "production":
        # TODO(email-provider): send `token` to `user.email` and return no token.
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Email provider is not configured yet — password reset is unavailable in production.",
        )
    return ForgotPasswordResponse(
        sent=True,
        expires_min=ttl_min,
        dev_reset_token=token,
        dev_reset_url=f"/reset-password?token={token}",
    )


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    token_row = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == hash_reset_token(payload.token)
        )
    )
    if token_row is None or token_row.used_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or already-used reset link")
    if token_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has expired")

    user = await db.get(User, token_row.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account no longer exists")

    user.password_hash = hash_password(payload.new_password)
    user.token_version = int(user.token_version or 0) + 1  # sign out everywhere
    token_row.used_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


@router.post("/recover-email", response_model=RecoverEmailResponse)
async def recover_email(
    payload: RecoverEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> RecoverEmailResponse:
    """\"Forgot your email?\" — identify the account by phone number.

    Dev returns the full email for testing; production only reveals a masked
    form (d***@domain) so the endpoint can't be used to harvest addresses.
    """
    user = await db.scalar(select(User).where(User.phone == payload.phone))
    if user is None:
        return RecoverEmailResponse(found=False)
    if settings.APP_ENV == "production":
        return RecoverEmailResponse(found=True, email=mask_email(user.email), name=user.full_name)
    return RecoverEmailResponse(found=True, email=user.email, name=user.full_name)


@router.post("/change-password", response_model=TokenResponse)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Change password. Bumps the token version (kills every other device's
    session) but returns a fresh token so THIS device stays signed in."""
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must differ from the current one")
    user.password_hash = hash_password(payload.new_password)
    user.token_version = int(user.token_version or 0) + 1  # sign out other devices
    await db.commit()
    await db.refresh(user)
    return _token_response(user)


@router.post("/signout-others", response_model=TokenResponse)
async def signout_others(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Sign out every device EXCEPT this one (privacy: revoke a lost/stolen
    device's sessions). Bumps the token version and issues a fresh token so
    the current session survives."""
    user.token_version = int(user.token_version or 0) + 1
    await db.commit()
    await db.refresh(user)
    return _token_response(user)


@router.post("/verify-phone", response_model=UserOut)
async def verify_phone(
    payload: PhoneVerifyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Phone OTP stub: in non-production any 6-digit code is accepted.

    Wire a real SMS provider here (Twilio/MSG91 etc.) behind the same contract
    in production — the endpoint shape won't change.
    """
    if settings.APP_ENV == "production":
        # Fail closed until a real OTP provider is wired — never accept codes.
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Phone OTP provider is not configured yet",
        )
    if len(payload.code) != 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code must be 6 digits")
    if user.phone is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No phone number on file")
    user.phone_verified = True
    await db.commit()
    await db.refresh(user)
    return user
