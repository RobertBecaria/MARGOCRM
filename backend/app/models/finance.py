import enum
import datetime as dt
from typing import Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PayrollStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"


class ExpenseCategory(str, enum.Enum):
    household = "household"
    transport = "transport"
    food = "food"
    entertainment = "entertainment"
    other = "other"


class ExpenseStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Payroll(Base):
    __tablename__ = "payroll"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    period_start: Mapped[dt.date] = mapped_column(Date)
    period_end: Mapped[dt.date] = mapped_column(Date)
    base_salary: Mapped[float] = mapped_column(Numeric(12, 2))
    bonuses: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    deductions: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    net_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    payment_source: Mapped[Optional[str]] = mapped_column(String(20), default="cash")
    status: Mapped[PayrollStatus] = mapped_column(Enum(PayrollStatus), default=PayrollStatus.pending)
    paid_date: Mapped[Optional[dt.date]] = mapped_column(Date)

    user = relationship("User")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    date: Mapped[dt.date] = mapped_column(Date)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500))
    payment_source: Mapped[Optional[str]] = mapped_column(String(20), default="cash")
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="pending")

    approver = relationship("User", foreign_keys=[approved_by])
    creator = relationship("User", foreign_keys=[created_by])


class Income(Base):
    __tablename__ = "income"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(500))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    date: Mapped[dt.date] = mapped_column(Date)
    category: Mapped[str] = mapped_column(String(100))
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500))
    payment_source: Mapped[Optional[str]] = mapped_column(String(20), default="cash")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())


class CashAdvance(Base):
    __tablename__ = "cash_advances"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    note: Mapped[Optional[str]] = mapped_column(String(500))
    date: Mapped[dt.date] = mapped_column(Date)
    payment_source: Mapped[Optional[str]] = mapped_column(String(20), default="cash")
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])
