import enum
import datetime as dt
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class StatusEnum(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    assigned_to: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_by_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(String(2000))
    priority: Mapped[PriorityEnum] = mapped_column(Enum(PriorityEnum), default=PriorityEnum.medium)
    status: Mapped[StatusEnum] = mapped_column(Enum(StatusEnum), default=StatusEnum.pending)
    due_date: Mapped[Optional[dt.date]] = mapped_column(Date)
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
