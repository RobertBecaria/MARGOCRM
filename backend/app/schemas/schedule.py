import datetime as dt
from typing import Optional

from pydantic import BaseModel

from app.models.schedule import ScheduleStatus
from app.schemas.user import UserResponse


class ScheduleCreate(BaseModel):
    user_id: int
    date: dt.date
    shift_start: dt.time
    shift_end: dt.time
    location: str
    notes: Optional[str] = None


class ScheduleUpdate(BaseModel):
    date: Optional[dt.date] = None
    shift_start: Optional[dt.time] = None
    shift_end: Optional[dt.time] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ScheduleStatus] = None


class ScheduleResponse(BaseModel):
    id: int
    user_id: int
    user: Optional[UserResponse] = None
    date: dt.date
    shift_start: dt.time
    shift_end: dt.time
    location: str
    notes: Optional[str] = None
    status: ScheduleStatus

    class Config:
        from_attributes = True


class ChangeRequestCreate(BaseModel):
    original_schedule_id: int
    requested_date: dt.date
    reason: str


class ChangeRequestUpdate(BaseModel):
    status: str  # approved | rejected


class ChangeRequestResponse(BaseModel):
    id: int
    user_id: int
    original_schedule_id: int
    requested_date: dt.date
    reason: str
    status: str
    reviewed_by: Optional[int] = None
    created_at: dt.datetime

    class Config:
        from_attributes = True
