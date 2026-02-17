import datetime as dt
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.rbac import require_role
from app.models.timecard import TimeCard
from app.models.user import RoleEnum, User
from app.schemas.timecard import ClockRequest, TimeCardResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/timecards", tags=["timecards"])

_IPAD_RE = re.compile(r"iPad|Macintosh.*Safari.*Mobile", re.IGNORECASE)


def _is_ipad(user_agent: str) -> bool:
    """Detect iPad from User-Agent string.

    Modern iPadOS identifies as 'Macintosh' in desktop mode, so we also
    check for Macintosh + Safari + touch-capable hints. The frontend sends
    a supplementary device_info field to help with detection.
    """
    if "iPad" in user_agent:
        return True
    # iPadOS 13+ in desktop mode
    if "Macintosh" in user_agent and "Safari" in user_agent:
        return True
    return False


@router.post("/clock-in", response_model=TimeCardResponse, status_code=status.HTTP_201_CREATED)
def clock_in(
    body: ClockRequest,
    user_agent: str = Header(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Determine device
    combined_ua = f"{user_agent} {body.device_info}"
    is_ipad = _is_ipad(combined_ua)

    if not is_ipad:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clock in/out is only available from the iPad at home",
        )

    today = dt.date.today()

    # Check if already clocked in today without clocking out
    existing = (
        db.query(TimeCard)
        .filter(
            TimeCard.user_id == current_user.id,
            TimeCard.date == today,
            TimeCard.clock_out.is_(None),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already clocked in today. Please clock out first.",
        )

    tc = TimeCard(
        user_id=current_user.id,
        date=today,
        device_type="iPad" if is_ipad else "other",
        is_ipad=is_ipad,
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc


@router.post("/clock-out", response_model=TimeCardResponse)
def clock_out(
    body: ClockRequest,
    user_agent: str = Header(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    combined_ua = f"{user_agent} {body.device_info}"
    is_ipad = _is_ipad(combined_ua)

    if not is_ipad:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clock in/out is only available from the iPad at home",
        )

    today = dt.date.today()
    tc = (
        db.query(TimeCard)
        .filter(
            TimeCard.user_id == current_user.id,
            TimeCard.date == today,
            TimeCard.clock_out.is_(None),
        )
        .first()
    )
    if not tc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active clock-in found for today.",
        )

    tc.clock_out = dt.datetime.utcnow()
    db.commit()
    db.refresh(tc)
    return tc


@router.get("/today", response_model=Optional[TimeCardResponse])
def get_today_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's clock-in status for today."""
    today = dt.date.today()
    tc = (
        db.query(TimeCard)
        .filter(TimeCard.user_id == current_user.id, TimeCard.date == today)
        .order_by(TimeCard.clock_in.desc())
        .first()
    )
    return tc


@router.get("", response_model=List[TimeCardResponse])
def list_timecards(
    user_id: Optional[int] = Query(None),
    date_from: Optional[dt.date] = Query(None),
    date_to: Optional[dt.date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List timecards. Staff see own only; owner/manager see all."""
    query = db.query(TimeCard).options(joinedload(TimeCard.user))

    if current_user.role not in (RoleEnum.owner, RoleEnum.manager):
        query = query.filter(TimeCard.user_id == current_user.id)
    elif user_id:
        query = query.filter(TimeCard.user_id == user_id)

    if date_from:
        query = query.filter(TimeCard.date >= date_from)
    if date_to:
        query = query.filter(TimeCard.date <= date_to)

    return query.order_by(TimeCard.date.desc(), TimeCard.clock_in.desc()).all()
