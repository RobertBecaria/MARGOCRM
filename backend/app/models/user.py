import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RoleEnum(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    driver = "driver"
    chef = "chef"
    assistant = "assistant"
    cleaner = "cleaner"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
