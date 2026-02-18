from datetime import datetime
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    type: str  # "expense" or "income"


class CategoryUpdate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True
