from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.rbac import require_role
from app.models.category import FinanceCategory
from app.models.user import RoleEnum, User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FinanceCategory)
    if type:
        query = query.filter(FinanceCategory.type == type)
    return query.order_by(FinanceCategory.name).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    if data.type not in ("expense", "income"):
        raise HTTPException(status_code=400, detail="Type must be 'expense' or 'income'")
    cat = FinanceCategory(name=data.name, type=data.type)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(
    cat_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    cat = db.query(FinanceCategory).filter(FinanceCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.name = data.name
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    cat = db.query(FinanceCategory).filter(FinanceCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
