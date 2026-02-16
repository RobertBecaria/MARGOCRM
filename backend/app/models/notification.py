from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NotificationType(str, enum.Enum):
    schedule = "schedule"
    task = "task"
    payment = "payment"
    system = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(String(1000))
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    channel: Mapped[str] = mapped_column(String(20), default="in_app")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
