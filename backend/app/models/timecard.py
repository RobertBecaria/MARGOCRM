import datetime as dt
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TimeCard(Base):
    __tablename__ = "timecards"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date: Mapped[dt.date] = mapped_column(Date, default=dt.date.today)
    clock_in: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())
    clock_out: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
    device_type: Mapped[str] = mapped_column(String(50), default="unknown")
    is_ipad: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User")
