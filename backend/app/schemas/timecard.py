import datetime as dt
from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserResponse


class TimeCardResponse(BaseModel):
    id: int
    user_id: int
    user: Optional[UserResponse] = None
    date: dt.date
    clock_in: dt.datetime
    clock_out: Optional[dt.datetime] = None
    device_type: str
    is_ipad: bool

    class Config:
        from_attributes = True


class ClockRequest(BaseModel):
    device_info: str = ""
