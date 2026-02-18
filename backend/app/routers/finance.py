import datetime as dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, extract
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.rbac import require_role
from app.models.finance import Expense, Income, Payroll
from app.models.user import RoleEnum, User
from app.schemas.finance import (
    CategorySummary,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    FinanceSummary,
    IncomeCreate,
    IncomeResponse,
    IncomeUpdate,
    MonthlySummary,
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


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    db.delete(expense)
    db.commit()


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


@router.put("/income/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: int,
    data: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(income, field, value)

    db.commit()
    db.refresh(income)
    return income


@router.delete("/income/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found")

    db.delete(income)
    db.commit()


# --- Summary ---

@router.get("/finance/summary", response_model=FinanceSummary)
def finance_summary(
    period_start: Optional[dt.date] = Query(None),
    period_end: Optional[dt.date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    # Default to current month
    today = dt.date.today()
    if not period_start:
        period_start = today.replace(day=1)
    if not period_end:
        period_end = today

    # All-time totals (no date filter) so dashboard always shows real numbers
    total_payroll = float(
        db.query(func.coalesce(func.sum(Payroll.net_amount), 0)).scalar()
    )

    total_expenses = float(
        db.query(func.coalesce(func.sum(Expense.amount), 0)).scalar()
    )

    total_income = float(
        db.query(func.coalesce(func.sum(Income.amount), 0)).scalar()
    )

    balance = total_income - total_expenses - total_payroll

    # Monthly breakdown (last 6 months)
    six_months_ago = (today.replace(day=1) - dt.timedelta(days=1)).replace(day=1)
    for _ in range(4):
        six_months_ago = (six_months_ago - dt.timedelta(days=1)).replace(day=1)

    monthly_income = (
        db.query(
            extract("year", Income.date).label("y"),
            extract("month", Income.date).label("m"),
            func.sum(Income.amount),
        )
        .filter(Income.date >= six_months_ago)
        .group_by("y", "m")
        .all()
    )

    monthly_expenses = (
        db.query(
            extract("year", Expense.date).label("y"),
            extract("month", Expense.date).label("m"),
            func.sum(Expense.amount),
        )
        .filter(Expense.date >= six_months_ago)
        .group_by("y", "m")
        .all()
    )

    monthly_payroll = (
        db.query(
            extract("year", Payroll.period_end).label("y"),
            extract("month", Payroll.period_end).label("m"),
            func.sum(Payroll.net_amount),
        )
        .filter(Payroll.period_end >= six_months_ago)
        .group_by("y", "m")
        .all()
    )

    months_map: dict[str, dict] = {}
    for y, m, amt in monthly_income:
        key = f"{int(y)}-{int(m):02d}"
        months_map.setdefault(key, {"month": key, "income": 0, "expenses": 0, "payroll": 0})
        months_map[key]["income"] = float(amt)

    for y, m, amt in monthly_expenses:
        key = f"{int(y)}-{int(m):02d}"
        months_map.setdefault(key, {"month": key, "income": 0, "expenses": 0, "payroll": 0})
        months_map[key]["expenses"] = float(amt)

    for y, m, amt in monthly_payroll:
        key = f"{int(y)}-{int(m):02d}"
        months_map.setdefault(key, {"month": key, "income": 0, "expenses": 0, "payroll": 0})
        months_map[key]["payroll"] = float(amt)

    monthly = [MonthlySummary(**v) for v in sorted(months_map.values(), key=lambda x: x["month"])]

    # Expense by category (all-time)
    cat_rows = (
        db.query(Expense.category, func.sum(Expense.amount))
        .group_by(Expense.category)
        .all()
    )
    expense_by_category = [
        CategorySummary(category=str(cat), amount=float(amt))
        for cat, amt in cat_rows
    ]

    if total_payroll > 0:
        expense_by_category.append(CategorySummary(category="Зарплаты", amount=total_payroll))

    return FinanceSummary(
        total_payroll=total_payroll,
        total_expenses=total_expenses,
        total_income=total_income,
        net=balance,
        balance=balance,
        period_start=period_start,
        period_end=period_end,
        monthly=monthly,
        expense_by_category=expense_by_category,
    )
