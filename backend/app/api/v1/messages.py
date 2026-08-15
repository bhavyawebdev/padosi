"""User-to-user direct messages (DMs) — a real neighbour inbox.

Kept deliberately simple: 1:1 conversations only, get-or-create semantics,
poll-based reads (no push), and unread counts computed on demand.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.messages import Conversation, Message
from app.models.user import User
from app.schemas.messages import (
    ConversationDetailOut,
    ConversationOut,
    ConversationStart,
    MessageCreate,
    MessageOut,
)

router = APIRouter()


def _pair_ids(a: uuid.UUID, b: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
    """Normalize a user pair so (A,B) and (B,A) map to the same row."""
    return (a, b) if str(a) < str(b) else (b, a)


def _msg_out(message: Message) -> MessageOut:
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=message.sender.full_name,
        body=message.body,
        created_at=message.created_at,
        read_at=message.read_at,
    )


async def _get_or_create_conversation(db: AsyncSession, user_a: uuid.UUID, user_b: uuid.UUID) -> Conversation:
    a, b = _pair_ids(user_a, user_b)
    existing = await db.scalar(
        select(Conversation).where(Conversation.user_a_id == a, Conversation.user_b_id == b)
    )
    if existing is not None:
        return existing
    conv = Conversation(user_a_id=a, user_b_id=b)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def _member_conversation(db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
    conv = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            (Conversation.user_a_id == user_id) | (Conversation.user_b_id == user_id),
        )
    )
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


def _other_id(conv: Conversation, user_id: uuid.UUID) -> uuid.UUID:
    return conv.user_b_id if conv.user_a_id == user_id else conv.user_a_id


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationOut]:
    convs = list(
        (
            await db.execute(
                select(Conversation)
                .where((Conversation.user_a_id == user.id) | (Conversation.user_b_id == user.id))
                .order_by(Conversation.last_message_at.desc())
            )
        ).scalars()
    )

    out: list[ConversationOut] = []
    for conv in convs:
        other = await db.get(User, _other_id(conv, user.id))
        last = await db.scalar(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        unread = (
            await db.scalar(
                select(func.count())
                .select_from(Message)
                .where(
                    Message.conversation_id == conv.id,
                    Message.sender_id != user.id,
                    Message.read_at.is_(None),
                )
            )
            or 0
        )
        out.append(
            ConversationOut(
                id=conv.id,
                other_user_id=_other_id(conv, user.id),
                other_name=other.full_name if other else "Neighbor",
                last_message=last.body if last else "",
                last_message_at=conv.last_message_at,
                unread_count=unread,
            )
        )
    return out


@router.post("/conversations", response_model=ConversationDetailOut, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    payload: ConversationStart,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailOut:
    if payload.user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't message yourself")
    other = await db.get(User, payload.user_id)
    if other is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    conv = await _get_or_create_conversation(db, user.id, other.id)
    messages = list(
        (
            await db.execute(
                select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.asc())
            )
        ).scalars()
    )
    return ConversationDetailOut(
        id=conv.id,
        other_user_id=other.id,
        other_name=other.full_name,
        messages=[_msg_out(m) for m in messages],
    )


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationDetailOut)
async def get_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetailOut:
    conv = await _member_conversation(db, conversation_id, user.id)
    other = await db.get(User, _other_id(conv, user.id))

    # Reading the thread marks the other person's messages as read.
    await db.execute(
        update(Message)
        .where(
            Message.conversation_id == conv.id,
            Message.sender_id != user.id,
            Message.read_at.is_(None),
        )
        .values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()

    messages = list(
        (
            await db.execute(
                select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.asc())
            )
        ).scalars()
    )
    return ConversationDetailOut(
        id=conv.id,
        other_user_id=_other_id(conv, user.id),
        other_name=other.full_name if other else "Neighbor",
        messages=[_msg_out(m) for m in messages],
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    conv = await _member_conversation(db, conversation_id, user.id)
    message = Message(conversation_id=conv.id, sender_id=user.id, body=payload.body.strip())
    conv.last_message_at = datetime.now(timezone.utc)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return _msg_out(message)
