import datetime as dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.rbac import require_role
from app.models.finance import Expense, Income, Payroll
from app.models.user import RoleEnum, User
from app.schemas.finance import (
    ExpenseCreate,
    ExpenseResponse,
    FinanceSummary,
    IncomeCreate,
    IncomeResponse,
    PayrollCreate,
    PayrollResponse,
    PayrollUpdate,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["finance"])


# --- Payroll ---

@router.get("/payroll", response_model=List[PayrollResponse])
def list_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Payroll).options(joinedload(Payroll.user))

    if current_user.role not in (RoleEnum.owner, RoleEnum.manager):
        query = query.filter(Payroll.user_id == current_user.id)

    return query.order_by(Payroll.period_end.desc()).all()


@router.post("/payroll", response_model=PayrollResponse, status_code=status.HTTP_201_CREATED)
def create_payroll(
    data: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner)),
):
    payroll = Payroll(**data.dict())
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return payroll


@router.put("/payroll/{payroll_id}", response_model=PayrollResponse)
def update_payroll(
    payroll_id: int,
    data: PayrollUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner)),
):
    payroll = db.query(Payroll).filter(Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(payroll, field, value)

    db.commit()
    db.refresh(payroll)
    return payroll


# --- Expenses ---

@router.get("/expenses", response_model=List[ExpenseResponse])
def list_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    return db.query(Expense).order_by(Expense.date.desc()).all()


@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    expense = Expense(**data.dict(), created_by=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


# --- Income ---

@router.get("/income", response_model=List[IncomeResponse])
def list_income(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    return db.query(Income).order_by(Income.date.desc()).all()


@router.post("/income", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    data: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    income = Income(**data.dict())
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


# --- Summary ---

@router.get("/finance/summary", response_model=FinanceSummary)
def finance_summary(
    period_start: dt.date = Query(...),
    period_end: dt.date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    total_payroll = (
        db.query(func.coalesce(func.sum(Payroll.net_amount), 0))
        .filter(Payroll.period_start >= period_start, Payroll.period_end <= period_end)
        .scalar()
    )

    total_expenses = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.date >= period_start, Expense.date <= period_end)
        .scalar()
    )

    total_income = (
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(Income.date >= period_start, Income.date <= period_end)
        .scalar()
    )

    return FinanceSummary(
        total_payroll=float(total_payroll),
        total_expenses=float(total_expenses),
        total_income=float(total_income),
        net=float(total_income) - float(total_expenses) - float(total_payroll),
        period_start=period_start,
        period_end=period_end,
    )
