import datetime as dt
from typing import Optional

from pydantic import BaseModel

from app.models.finance import PayrollStatus
from app.schemas.user import UserResponse


class PayrollCreate(BaseModel):
    user_id: int
    period_start: dt.date
    period_end: dt.date
    base_salary: float
    bonuses: float = 0
    deductions: float = 0
    net_amount: float


class PayrollUpdate(BaseModel):
    base_salary: Optional[float] = None
    bonuses: Optional[float] = None
    deductions: Optional[float] = None
    net_amount: Optional[float] = None
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
    status: PayrollStatus
    paid_date: Optional[dt.date] = None

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    date: dt.date
    receipt_url: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    category: str
    description: str
    amount: float
    date: dt.date
    receipt_url: Optional[str] = None
    approved_by: Optional[int] = None
    created_by: int
    created_at: dt.datetime

    class Config:
        from_attributes = True


class IncomeCreate(BaseModel):
    source: str
    description: str
    amount: float
    date: dt.date
    category: str


class IncomeResponse(BaseModel):
    id: int
    source: str
    description: str
    amount: float
    date: dt.date
    category: str
    created_at: dt.datetime

    class Config:
        from_attributes = True


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[dt.date] = None
    receipt_url: Optional[str] = None


class IncomeUpdate(BaseModel):
    source: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[dt.date] = None
    category: Optional[str] = None


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
