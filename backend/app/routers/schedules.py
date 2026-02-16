from typing import List, Optional
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.rbac import require_role
from app.models.schedule import Schedule, ScheduleChangeRequest
from app.models.user import RoleEnum, User
from app.schemas.schedule import (
    ChangeRequestCreate,
    ChangeRequestResponse,
    ChangeRequestUpdate,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=List[ScheduleResponse])
def list_schedules(
    user_id: Optional[int] = Query(None),
    date_from: Optional[dt.date] = Query(None),
    date_to: Optional[dt.date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Schedule).options(joinedload(Schedule.user))

    # Staff can only see their own schedules
    if current_user.role not in (RoleEnum.owner, RoleEnum.manager):
        query = query.filter(Schedule.user_id == current_user.id)
    elif user_id:
        query = query.filter(Schedule.user_id == user_id)

    if date_from:
        query = query.filter(Schedule.date >= date_from)
    if date_to:
        query = query.filter(Schedule.date <= date_to)

    return query.order_by(Schedule.date).all()


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    schedule = Schedule(**data.dict())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    from app.models.schedule import ScheduleStatus
    schedule.status = ScheduleStatus.cancelled
    db.commit()


@router.post("/change-request", response_model=ChangeRequestResponse, status_code=status.HTTP_201_CREATED)
def create_change_request(
    data: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = db.query(Schedule).filter(Schedule.id == data.original_schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    if current_user.role not in (RoleEnum.owner, RoleEnum.manager) and schedule.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your schedule")

    request = ScheduleChangeRequest(
        user_id=current_user.id,
        original_schedule_id=data.original_schedule_id,
        requested_date=data.requested_date,
        reason=data.reason,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.put("/change-request/{request_id}", response_model=ChangeRequestResponse)
def review_change_request(
    request_id: int,
    data: ChangeRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    request = db.query(ScheduleChangeRequest).filter(ScheduleChangeRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Change request not found")

    request.status = data.status
    request.reviewed_by = current_user.id
    db.commit()
    db.refresh(request)
    return request
