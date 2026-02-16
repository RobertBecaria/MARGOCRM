import enum
import datetime as dt
from typing import Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScheduleStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date: Mapped[dt.date] = mapped_column(Date)
    shift_start: Mapped[dt.time] = mapped_column(Time)
    shift_end: Mapped[dt.time] = mapped_column(Time)
    location: Mapped[str] = mapped_column(String(500))
    notes: Mapped[Optional[str]] = mapped_column(String(1000))
    status: Mapped[ScheduleStatus] = mapped_column(Enum(ScheduleStatus), default=ScheduleStatus.scheduled)

    user = relationship("User")


class ScheduleChangeRequest(Base):
    __tablename__ = "schedule_change_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    original_schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))
    requested_date: Mapped[dt.date] = mapped_column(Date)
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
