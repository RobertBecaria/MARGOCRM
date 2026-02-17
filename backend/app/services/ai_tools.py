import datetime as dt
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.finance import Expense, ExpenseCategory, Income, Payroll, PayrollStatus
from app.models.notification import Notification, NotificationType
from app.models.schedule import Schedule, ScheduleChangeRequest, ScheduleStatus
from app.models.task import PriorityEnum, StatusEnum, Task
from app.models.user import RoleEnum, User
from app.utils.security import hash_password


# --- Tool Functions ---

def list_staff(db: Session, role: Optional[str] = None) -> List[Dict]:
    query = db.query(User).filter(User.is_active == True)
    if role:
        query = query.filter(User.role == role)
    users = query.all()
    return [
        {"id": u.id, "full_name": u.full_name, "role": u.role.value, "phone": u.phone, "email": u.email}
        for u in users
    ]


def get_staff_by_id(db: Session, user_id: int) -> Dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}
    return {"id": user.id, "full_name": user.full_name, "role": user.role.value, "phone": user.phone, "email": user.email}


def create_staff(db: Session, email: str, full_name: str, role: str, phone: Optional[str] = None, password: str = "staff123") -> Dict:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return {"error": "Email already registered"}
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=RoleEnum(role),
        phone=phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "full_name": user.full_name, "role": user.role.value, "message": "Staff created successfully"}


def get_schedule(db: Session, user_id: Optional[int] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict]:
    query = db.query(Schedule)
    if user_id:
        query = query.filter(Schedule.user_id == user_id)
    if date_from:
        query = query.filter(Schedule.date >= dt.date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Schedule.date <= dt.date.fromisoformat(date_to))
    schedules = query.order_by(Schedule.date).all()
    return [
        {
            "id": s.id, "user_id": s.user_id, "date": str(s.date),
            "shift_start": str(s.shift_start), "shift_end": str(s.shift_end),
            "location": s.location, "notes": s.notes, "status": s.status.value,
        }
        for s in schedules
    ]


def create_schedule(db: Session, user_id: int, date: str, shift_start: str, shift_end: str, location: str, notes: Optional[str] = None) -> Dict:
    schedule = Schedule(
        user_id=user_id,
        date=dt.date.fromisoformat(date),
        shift_start=dt.time.fromisoformat(shift_start),
        shift_end=dt.time.fromisoformat(shift_end),
        location=location,
        notes=notes,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return {"id": schedule.id, "message": f"Schedule created for {date}"}


def update_schedule_status(db: Session, schedule_id: int, status: str) -> Dict:
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        return {"error": "Schedule not found"}
    schedule.status = ScheduleStatus(status)
    db.commit()
    return {"id": schedule.id, "status": status, "message": "Schedule updated"}


def get_tasks(db: Session, assigned_to: Optional[int] = None, status: Optional[str] = None) -> List[Dict]:
    query = db.query(Task)
    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if status:
        query = query.filter(Task.status == status)
    tasks = query.order_by(Task.created_at.desc()).all()
    return [
        {
            "id": t.id, "title": t.title, "description": t.description,
            "assigned_to": t.assigned_to, "priority": t.priority.value,
            "status": t.status.value, "due_date": str(t.due_date) if t.due_date else None,
        }
        for t in tasks
    ]


def create_task(db: Session, assigned_to: int, title: str, description: Optional[str] = None, priority: str = "medium", due_date: Optional[str] = None) -> Dict:
    task = Task(
        assigned_to=assigned_to,
        title=title,
        description=description,
        priority=PriorityEnum(priority),
        due_date=dt.date.fromisoformat(due_date) if due_date else None,
        created_by_ai=True,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "title": title, "message": "Task created"}


def update_task_status(db: Session, task_id: int, status: str, _caller_id: Optional[int] = None) -> Dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}
    # If called by staff, enforce task ownership
    if _caller_id is not None and task.assigned_to != _caller_id:
        return {"error": "Permission denied: not your task"}
    task.status = StatusEnum(status)
    db.commit()
    return {"id": task.id, "status": status, "message": "Task status updated"}


def get_payroll(db: Session, user_id: Optional[int] = None) -> List[Dict]:
    query = db.query(Payroll)
    if user_id:
        query = query.filter(Payroll.user_id == user_id)
    records = query.order_by(Payroll.period_end.desc()).all()
    return [
        {
            "id": p.id, "user_id": p.user_id,
            "period_start": str(p.period_start), "period_end": str(p.period_end),
            "base_salary": float(p.base_salary), "bonuses": float(p.bonuses),
            "deductions": float(p.deductions), "net_amount": float(p.net_amount),
            "status": p.status.value,
        }
        for p in records
    ]


def create_payroll(db: Session, user_id: int, period_start: str, period_end: str, base_salary: float, bonuses: float = 0, deductions: float = 0) -> Dict:
    net = base_salary + bonuses - deductions
    payroll = Payroll(
        user_id=user_id,
        period_start=dt.date.fromisoformat(period_start),
        period_end=dt.date.fromisoformat(period_end),
        base_salary=base_salary,
        bonuses=bonuses,
        deductions=deductions,
        net_amount=net,
    )
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return {"id": payroll.id, "net_amount": net, "message": "Payroll record created"}


def get_finance_summary(db: Session, period_start: str, period_end: str) -> Dict:
    start = dt.date.fromisoformat(period_start)
    end = dt.date.fromisoformat(period_end)

    total_payroll = float(
        db.query(func.coalesce(func.sum(Payroll.net_amount), 0))
        .filter(Payroll.period_start >= start, Payroll.period_end <= end)
        .scalar()
    )
    total_expenses = float(
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.date >= start, Expense.date <= end)
        .scalar()
    )
    total_income = float(
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(Income.date >= start, Income.date <= end)
        .scalar()
    )
    return {
        "total_payroll": total_payroll,
        "total_expenses": total_expenses,
        "total_income": total_income,
        "net": total_income - total_expenses - total_payroll,
        "period": f"{period_start} - {period_end}",
    }


def create_expense(db: Session, category: str, description: str, amount: float, date: str, created_by: int) -> Dict:
    expense = Expense(
        category=ExpenseCategory(category),
        description=description,
        amount=amount,
        date=dt.date.fromisoformat(date),
        created_by=created_by,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return {"id": expense.id, "amount": amount, "category": category, "message": f"Расход добавлен: {description} — {amount}₽"}


def get_expenses(db: Session, date_from: Optional[str] = None, date_to: Optional[str] = None, category: Optional[str] = None) -> List[Dict]:
    query = db.query(Expense)
    if date_from:
        query = query.filter(Expense.date >= dt.date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Expense.date <= dt.date.fromisoformat(date_to))
    if category:
        query = query.filter(Expense.category == category)
    expenses = query.order_by(Expense.date.desc()).all()
    return [
        {
            "id": e.id, "category": e.category.value, "description": e.description,
            "amount": float(e.amount), "date": str(e.date),
        }
        for e in expenses
    ]


def create_income(db: Session, source: str, description: str, amount: float, date: str, category: str = "other") -> Dict:
    income = Income(
        source=source,
        description=description,
        amount=amount,
        date=dt.date.fromisoformat(date),
        category=category,
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return {"id": income.id, "amount": amount, "message": f"Доход добавлен: {description} — {amount}₽"}


def get_income(db: Session, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict]:
    query = db.query(Income)
    if date_from:
        query = query.filter(Income.date >= dt.date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Income.date <= dt.date.fromisoformat(date_to))
    records = query.order_by(Income.date.desc()).all()
    return [
        {
            "id": r.id, "source": r.source, "description": r.description,
            "amount": float(r.amount), "date": str(r.date), "category": r.category,
        }
        for r in records
    ]


def send_notification(db: Session, user_id: int, title: str, message: str, type: str = "system") -> Dict:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=NotificationType(type),
    )
    db.add(notification)
    db.commit()
    return {"message": "Notification sent"}


def attach_image_to_task(db: Session, task_id: int, image_url: str) -> Dict:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}
    task.image_url = image_url
    db.commit()
    return {"id": task.id, "image_url": image_url, "message": f"Изображение прикреплено к задаче '{task.title}'"}


def attach_image_to_expense(db: Session, expense_id: int, image_url: str) -> Dict:
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        return {"error": "Expense not found"}
    expense.receipt_url = image_url
    db.commit()
    return {"id": expense.id, "receipt_url": image_url, "message": f"Чек прикреплён к расходу '{expense.description}'"}


def create_expense_from_receipt(db: Session, category: str, description: str, amount: float, date: str, receipt_url: str, created_by: int) -> Dict:
    expense = Expense(
        category=ExpenseCategory(category),
        description=description,
        amount=amount,
        date=dt.date.fromisoformat(date),
        receipt_url=receipt_url,
        created_by=created_by,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return {"id": expense.id, "amount": amount, "category": category, "message": f"Расход из чека добавлен: {description} — {amount}₽"}


def create_schedule_change_request(db: Session, user_id: int, schedule_id: int, requested_date: str, reason: str) -> Dict:
    request = ScheduleChangeRequest(
        user_id=user_id,
        original_schedule_id=schedule_id,
        requested_date=dt.date.fromisoformat(requested_date),
        reason=reason,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return {"id": request.id, "message": "Change request created"}


# --- Tool Dispatch ---

TOOL_DISPATCH = {
    "list_staff": list_staff,
    "get_staff_by_id": get_staff_by_id,
    "create_staff": create_staff,
    "get_schedule": get_schedule,
    "create_schedule": create_schedule,
    "update_schedule_status": update_schedule_status,
    "get_tasks": get_tasks,
    "create_task": create_task,
    "update_task_status": update_task_status,
    "get_payroll": get_payroll,
    "create_payroll": create_payroll,
    "get_finance_summary": get_finance_summary,
    "create_expense": create_expense,
    "get_expenses": get_expenses,
    "create_income": create_income,
    "get_income": get_income,
    "send_notification": send_notification,
    "attach_image_to_task": attach_image_to_task,
    "attach_image_to_expense": attach_image_to_expense,
    "create_expense_from_receipt": create_expense_from_receipt,
    "create_schedule_change_request": create_schedule_change_request,
}


# --- Tool Definitions for DeepSeek ---

OWNER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_staff",
            "description": "Получить список сотрудников. Можно фильтровать по роли.",
            "parameters": {
                "type": "object",
                "properties": {
                    "role": {"type": "string", "enum": ["driver", "chef", "assistant", "cleaner", "manager"]}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_staff_by_id",
            "description": "Получить информацию о сотруднике по ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer", "description": "ID сотрудника"},
                },
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_staff",
            "description": "Создать нового сотрудника.",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {"type": "string"},
                    "full_name": {"type": "string"},
                    "role": {"type": "string", "enum": ["driver", "chef", "assistant", "cleaner", "manager"]},
                    "phone": {"type": "string"},
                    "password": {"type": "string"},
                },
                "required": ["email", "full_name", "role"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_schedule",
            "description": "Получить расписание. Можно фильтровать по сотруднику и датам.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer"},
                    "date_from": {"type": "string", "description": "YYYY-MM-DD"},
                    "date_to": {"type": "string", "description": "YYYY-MM-DD"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_schedule",
            "description": "Создать смену в расписании.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer"},
                    "date": {"type": "string", "description": "YYYY-MM-DD"},
                    "shift_start": {"type": "string", "description": "HH:MM"},
                    "shift_end": {"type": "string", "description": "HH:MM"},
                    "location": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["user_id", "date", "shift_start", "shift_end", "location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_schedule_status",
            "description": "Обновить статус смены (scheduled/completed/cancelled).",
            "parameters": {
                "type": "object",
                "properties": {
                    "schedule_id": {"type": "integer"},
                    "status": {"type": "string", "enum": ["scheduled", "completed", "cancelled"]},
                },
                "required": ["schedule_id", "status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "Получить список задач. Можно фильтровать по исполнителю и статусу.",
            "parameters": {
                "type": "object",
                "properties": {
                    "assigned_to": {"type": "integer"},
                    "status": {"type": "string", "enum": ["pending", "in_progress", "done"]},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Создать новую задачу для сотрудника.",
            "parameters": {
                "type": "object",
                "properties": {
                    "assigned_to": {"type": "integer"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
                    "due_date": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["assigned_to", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_task_status",
            "description": "Обновить статус задачи.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer"},
                    "status": {"type": "string", "enum": ["pending", "in_progress", "done"]},
                },
                "required": ["task_id", "status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_payroll",
            "description": "Получить записи о зарплатах.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_payroll",
            "description": "Создать запись о зарплате.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer"},
                    "period_start": {"type": "string", "description": "YYYY-MM-DD"},
                    "period_end": {"type": "string", "description": "YYYY-MM-DD"},
                    "base_salary": {"type": "number"},
                    "bonuses": {"type": "number"},
                    "deductions": {"type": "number"},
                },
                "required": ["user_id", "period_start", "period_end", "base_salary"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_finance_summary",
            "description": "Получить финансовую сводку за период.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period_start": {"type": "string", "description": "YYYY-MM-DD"},
                    "period_end": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["period_start", "period_end"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_expense",
            "description": "Добавить расход. Категории: household (хозяйство), transport (транспорт), food (еда), entertainment (развлечения), other (прочее).",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": ["household", "transport", "food", "entertainment", "other"]},
                    "description": {"type": "string", "description": "Описание расхода"},
                    "amount": {"type": "number", "description": "Сумма в рублях"},
                    "date": {"type": "string", "description": "Дата YYYY-MM-DD"},
                },
                "required": ["category", "description", "amount", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_expenses",
            "description": "Получить список расходов. Можно фильтровать по датам и категории.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date_from": {"type": "string", "description": "YYYY-MM-DD"},
                    "date_to": {"type": "string", "description": "YYYY-MM-DD"},
                    "category": {"type": "string", "enum": ["household", "transport", "food", "entertainment", "other"]},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_income",
            "description": "Добавить доход.",
            "parameters": {
                "type": "object",
                "properties": {
                    "source": {"type": "string", "description": "Источник дохода"},
                    "description": {"type": "string", "description": "Описание"},
                    "amount": {"type": "number", "description": "Сумма в рублях"},
                    "date": {"type": "string", "description": "Дата YYYY-MM-DD"},
                    "category": {"type": "string", "description": "Категория дохода"},
                },
                "required": ["source", "description", "amount", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_income",
            "description": "Получить список доходов. Можно фильтровать по датам.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date_from": {"type": "string", "description": "YYYY-MM-DD"},
                    "date_to": {"type": "string", "description": "YYYY-MM-DD"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_notification",
            "description": "Отправить уведомление сотруднику.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer"},
                    "title": {"type": "string"},
                    "message": {"type": "string"},
                    "type": {"type": "string", "enum": ["schedule", "task", "payment", "system"]},
                },
                "required": ["user_id", "title", "message"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "attach_image_to_task",
            "description": "Прикрепить загруженное изображение к задаче.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "ID задачи"},
                    "image_url": {"type": "string", "description": "URL загруженного изображения"},
                },
                "required": ["task_id", "image_url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "attach_image_to_expense",
            "description": "Прикрепить фото чека к расходу.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expense_id": {"type": "integer", "description": "ID расхода"},
                    "image_url": {"type": "string", "description": "URL загруженного изображения"},
                },
                "required": ["expense_id", "image_url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_expense_from_receipt",
            "description": "Создать расход из загруженного чека/счёта. Используй когда пользователь загрузил фото чека и просит добавить в расходы.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": ["household", "transport", "food", "entertainment", "other"]},
                    "description": {"type": "string", "description": "Описание расхода"},
                    "amount": {"type": "number", "description": "Сумма в рублях"},
                    "date": {"type": "string", "description": "Дата YYYY-MM-DD"},
                    "receipt_url": {"type": "string", "description": "URL загруженного чека"},
                },
                "required": ["category", "description", "amount", "date", "receipt_url"],
            },
        },
    },
]

STAFF_TOOL_NAMES = {
    "get_tasks", "update_task_status", "get_schedule",
    "get_payroll", "create_schedule_change_request",
}

STAFF_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "Получить мои задачи. Можно фильтровать по статусу.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["pending", "in_progress", "done"]},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_task_status",
            "description": "Обновить статус моей задачи.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer"},
                    "status": {"type": "string", "enum": ["pending", "in_progress", "done"]},
                },
                "required": ["task_id", "status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_schedule",
            "description": "Получить моё расписание.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date_from": {"type": "string", "description": "YYYY-MM-DD"},
                    "date_to": {"type": "string", "description": "YYYY-MM-DD"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_payroll",
            "description": "Получить мои записи о зарплате.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_schedule_change_request",
            "description": "Запросить изменение расписания.",
            "parameters": {
                "type": "object",
                "properties": {
                    "schedule_id": {"type": "integer", "description": "ID текущей смены"},
                    "requested_date": {"type": "string", "description": "Желаемая дата YYYY-MM-DD"},
                    "reason": {"type": "string", "description": "Причина запроса"},
                },
                "required": ["schedule_id", "requested_date", "reason"],
            },
        },
    },
]
