import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.finance import PayrollStatus
from app.schemas.user import UserResponse

VALID_PAYMENT_SOURCES = Literal["cash", "ip", "card"]


class PayrollCreate(BaseModel):
    user_id: int
    period_start: dt.date
    period_end: dt.date
    base_salary: float = Field(gt=0)
    bonuses: float = Field(ge=0, default=0)
    deductions: float = Field(ge=0, default=0)
    net_amount: float = Field(gt=0)
    payment_source: VALID_PAYMENT_SOURCES = "cash"


class PayrollUpdate(BaseModel):
    user_id: Optional[int] = None
    period_start: Optional[dt.date] = None
    period_end: Optional[dt.date] = None
    base_salary: Optional[float] = Field(None, gt=0)
    bonuses: Optional[float] = Field(None, ge=0)
    deductions: Optional[float] = Field(None, ge=0)
    net_amount: Optional[float] = Field(None, gt=0)
    payment_source: Optional[VALID_PAYMENT_SOURCES] = None
    status: Optional[PayrollStatus] = None
    paid_date: Optional[dt.date] = None


class PayrollResponse(BaseModel):
    id: int
    user_id: int
    user: Optional[UserResponse] = None
    period_start: dt.date
    period_end: dt.date
    base_salary: float
    bonuses: float
    deductions: float
    net_amount: float
    payment_source: Optional[VALID_PAYMENT_SOURCES] = "cash"
    status: PayrollStatus
    paid_date: Optional[dt.date] = None

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float = Field(gt=0)
    date: dt.date
    receipt_url: Optional[str] = None
    payment_source: VALID_PAYMENT_SOURCES = "cash"

    @field_validator("receipt_url")
    @classmethod
    def validate_receipt_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.startswith(("https://", "http://")):
            raise ValueError("receipt_url must be an HTTP(S) URL")
        return v


class ExpenseResponse(BaseModel):
    id: int
    category: str
    description: str
    amount: float
    date: dt.date
    receipt_url: Optional[str] = None
    payment_source: Optional[VALID_PAYMENT_SOURCES] = "cash"
    approved_by: Optional[int] = None
    created_by: int
    created_at: dt.datetime
    status: str = "pending"

    class Config:
        from_attributes = True


class IncomeCreate(BaseModel):
    source: str
    description: str
    amount: float = Field(gt=0)
    date: dt.date
    category: str
    receipt_url: Optional[str] = None
    payment_source: VALID_PAYMENT_SOURCES = "cash"

    @field_validator("receipt_url")
    @classmethod
    def validate_receipt_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.startswith(("https://", "http://")):
            raise ValueError("receipt_url must be an HTTP(S) URL")
        return v


class IncomeResponse(BaseModel):
    id: int
    source: str
    description: str
    amount: float
    date: dt.date
    category: str
    receipt_url: Optional[str] = None
    payment_source: Optional[VALID_PAYMENT_SOURCES] = "cash"
    created_at: dt.datetime

    class Config:
        from_attributes = True


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[dt.date] = None
    receipt_url: Optional[str] = None
    payment_source: Optional[VALID_PAYMENT_SOURCES] = None

    @field_validator("receipt_url")
    @classmethod
    def validate_receipt_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.startswith(("https://", "http://")):
            raise ValueError("receipt_url must be an HTTP(S) URL")
        return v


class ExpenseApproval(BaseModel):
    status: str  # "approved" or "rejected"


class IncomeUpdate(BaseModel):
    source: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[dt.date] = None
    category: Optional[str] = None
    receipt_url: Optional[str] = None
    payment_source: Optional[VALID_PAYMENT_SOURCES] = None

    @field_validator("receipt_url")
    @classmethod
    def validate_receipt_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.startswith(("https://", "http://")):
            raise ValueError("receipt_url must be an HTTP(S) URL")
        return v


class MonthlySummary(BaseModel):
    month: str
    income: float
    expenses: float
    payroll: float = 0


class CategorySummary(BaseModel):
    category: str
    amount: float


class FinanceSummary(BaseModel):
    total_payroll: float
    total_expenses: float
    total_income: float
    net: float
    balance: float
    period_start: dt.date
    period_end: dt.date
    monthly: list[MonthlySummary] = []
    expense_by_category: list[CategorySummary] = []


class CashAdvanceCreate(BaseModel):
    user_id: int
    amount: float = Field(gt=0)
    note: Optional[str] = None
    date: dt.date
    payment_source: VALID_PAYMENT_SOURCES = "cash"


class CashAdvanceResponse(BaseModel):
    id: int
    user_id: int
    user: Optional[UserResponse] = None
    amount: float
    note: Optional[str] = None
    date: dt.date
    payment_source: Optional[VALID_PAYMENT_SOURCES] = "cash"
    created_by: int
    created_at: dt.datetime

    class Config:
        from_attributes = True


class CashAdvanceBalance(BaseModel):
    user_id: int
    full_name: str
    total_advanced: float
    total_spent: float
    remaining: float


class AutoPayrollEntry(BaseModel):
    user_id: int
    period_start: dt.date
    period_end: dt.date
    base_salary: float = Field(gt=0)
    bonuses: float = Field(ge=0, default=0)
    deductions: float = Field(ge=0, default=0)
    net_amount: float = Field(gt=0)
    payment_source: VALID_PAYMENT_SOURCES = "cash"


class AutoPayrollRequest(BaseModel):
    entries: list[AutoPayrollEntry]
