"""Locality listing — powers the "which society are you in" signup picker.

Deviation note: the master brief's v1 folder lists only auth/users/feed/
directory/requests. A public localities endpoint is required by signup
(location/society selection), so it lives in its own module rather than being
bolted awkwardly onto users.py.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import Locality
from app.schemas.user import LocalityOut

router = APIRouter()


@router.get("", response_model=list[LocalityOut])
async def list_localities(
    city: str | None = None,
    state: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Locality]:
    stmt = select(Locality).order_by(Locality.state, Locality.city, Locality.name)
    if city:
        stmt = stmt.where(Locality.city.ilike(f"%{city}%"))
    if state:
        stmt = stmt.where(Locality.state.ilike(f"%{state}%"))
    if q:
        stmt = stmt.where(Locality.name.ilike(f"%{q}%"))
    return list((await db.scalars(stmt)).all())
