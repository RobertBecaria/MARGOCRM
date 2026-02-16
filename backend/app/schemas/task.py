import datetime as dt
from typing import Optional

from pydantic import BaseModel

from app.models.task import PriorityEnum, StatusEnum
from app.schemas.user import UserResponse


class TaskCreate(BaseModel):
    assigned_to: int
    title: str
    description: Optional[str] = None
    priority: PriorityEnum = PriorityEnum.medium
    due_date: Optional[dt.date] = None


class TaskUpdate(BaseModel):
    assigned_to: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[StatusEnum] = None
    due_date: Optional[dt.date] = None


class TaskResponse(BaseModel):
    id: int
    assigned_to: int
    assignee: Optional[UserResponse] = None
    created_by: Optional[int] = None
    created_by_ai: bool
    title: str
    description: Optional[str] = None
    priority: PriorityEnum
    status: StatusEnum
    due_date: Optional[dt.date] = None
    created_at: dt.datetime

    class Config:
        from_attributes = True
