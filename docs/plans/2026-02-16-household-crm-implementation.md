# Household Staff CRM — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack household staff CRM with AI assistant for managing staff, schedules, tasks, payroll, and finances.

**Architecture:** Monolith — FastAPI backend + React SPA (Vite) + PostgreSQL. AI assistant via DeepSeek V3.2 function calling over WebSocket. Docker Compose deployment.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL 16, React 18, Vite, Tailwind CSS, Zustand, TanStack Query, Recharts, react-i18next, DeepSeek V3.2 API, Resend email.

**Project root:** `/Users/orlandobecaria/household-crm/`

---

## Directory Structure

```
household-crm/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── config.py               # Settings via pydantic-settings
│   │   ├── database.py             # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── schedule.py
│   │   │   ├── task.py
│   │   │   ├── finance.py
│   │   │   ├── ai.py
│   │   │   └── notification.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── schedule.py
│   │   │   ├── task.py
│   │   │   ├── finance.py
│   │   │   ├── ai.py
│   │   │   └── notification.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── schedules.py
│   │   │   ├── tasks.py
│   │   │   ├── finance.py
│   │   │   ├── ai_chat.py
│   │   │   └── notifications.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── ai_agent.py
│   │   │   ├── ai_tools.py
│   │   │   ├── email.py
│   │   │   └── notification.py
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   └── rbac.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── security.py
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── alembic.ini
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_users.py
│   │   ├── test_schedules.py
│   │   ├── test_tasks.py
│   │   ├── test_finance.py
│   │   ├── test_ai.py
│   │   └── test_notifications.py
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   ├── client.ts            # axios instance with JWT interceptor
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── schedules.ts
│   │   │   ├── tasks.ts
│   │   │   ├── finance.ts
│   │   │   ├── ai.ts
│   │   │   └── notifications.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Layout.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   ├── ai/
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   └── ActionCard.tsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   └── Select.tsx
│   │   │   └── shared/
│   │   │       ├── NotificationBell.tsx
│   │   │       ├── RoleGuard.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── owner/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Staff.tsx
│   │   │   │   ├── Schedules.tsx
│   │   │   │   ├── Tasks.tsx
│   │   │   │   ├── Finance.tsx
│   │   │   │   ├── Notifications.tsx
│   │   │   │   └── Settings.tsx
│   │   │   └── staff/
│   │   │       ├── MyDay.tsx
│   │   │       ├── MySchedule.tsx
│   │   │       ├── MyTasks.tsx
│   │   │       ├── MyPay.tsx
│   │   │       └── AiChat.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   └── themeStore.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useWebSocket.ts
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   └── ru.json
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── formatters.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── .env.example
```

---

## Phase 0: Project Scaffolding (Sequential — must complete first)

> **Assigned to:** Backend Agent starts, then Frontend Agent joins.
> **All other agents wait for Phase 0 to complete.**

### Task 0.1: Initialize Backend Project

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`

**Step 1: Create `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
gunicorn==22.0.0
sqlalchemy==2.0.35
alembic==1.13.2
psycopg2-binary==2.9.9
pydantic==2.9.0
pydantic-settings==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
httpx==0.27.0
resend==2.0.0
websockets==12.0
pytest==8.3.0
pytest-asyncio==0.24.0
httpx==0.27.0
```

**Step 2: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://dom:dom@localhost:5432/dom"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    resend_api_key: str = ""
    from_email: str = "noreply@dom.app"

    class Config:
        env_file = ".env"


settings = Settings()
```

**Step 3: Create `backend/app/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 4: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Dom — Household CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

**Step 5: Verify backend starts**

Run: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
Expected: Server starts on port 8000, `GET /api/health` returns `{"status": "ok"}`

**Step 6: Commit**
```bash
git add backend/
git commit -m "feat: initialize backend project with FastAPI scaffold"
```

---

### Task 0.2: Initialize Frontend Project

**Step 1: Scaffold Vite + React + TypeScript**

Run:
```bash
cd /Users/orlandobecaria/household-crm
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Step 2: Install dependencies**

Run:
```bash
cd frontend
npm install tailwindcss @tailwindcss/vite react-router-dom zustand @tanstack/react-query axios recharts react-i18next i18next date-fns lucide-react
npm install -D @types/react @types/react-dom
```

**Step 3: Configure Tailwind (Vite plugin approach)**

Modify: `frontend/vite.config.ts`
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": { target: "http://localhost:8000", ws: true },
    },
  },
});
```

Replace `frontend/src/index.css` with:
```css
@import "tailwindcss";
```

**Step 4: Set up i18n with Russian locale**

Create: `frontend/src/i18n/ru.json`
```json
{
  "app": { "name": "Дом" },
  "nav": {
    "dashboard": "Главная",
    "staff": "Персонал",
    "schedules": "Расписание",
    "tasks": "Задачи",
    "finance": "Финансы",
    "notifications": "Уведомления",
    "settings": "Настройки",
    "myDay": "Мой день",
    "mySchedule": "Моё расписание",
    "myTasks": "Мои задачи",
    "myPay": "Мои выплаты",
    "aiChat": "AI Ассистент"
  },
  "auth": {
    "login": "Войти",
    "email": "Электронная почта",
    "password": "Пароль",
    "loginTitle": "Вход в систему",
    "logout": "Выйти"
  },
  "staff": {
    "title": "Персонал",
    "addStaff": "Добавить сотрудника",
    "name": "Имя",
    "role": "Должность",
    "phone": "Телефон",
    "email": "Почта",
    "status": "Статус",
    "active": "Активен",
    "inactive": "Неактивен"
  },
  "roles": {
    "owner": "Владелец",
    "manager": "Менеджер",
    "driver": "Водитель",
    "chef": "Повар",
    "assistant": "Ассистент",
    "cleaner": "Клинер"
  },
  "schedule": {
    "title": "Расписание",
    "addShift": "Добавить смену",
    "date": "Дата",
    "start": "Начало",
    "end": "Конец",
    "location": "Место",
    "scheduled": "Запланировано",
    "completed": "Выполнено",
    "cancelled": "Отменено"
  },
  "tasks": {
    "title": "Задачи",
    "addTask": "Новая задача",
    "pending": "Ожидает",
    "inProgress": "В работе",
    "done": "Готово",
    "low": "Низкий",
    "medium": "Средний",
    "high": "Высокий",
    "urgent": "Срочный"
  },
  "finance": {
    "title": "Финансы",
    "payroll": "Зарплаты",
    "expenses": "Расходы",
    "income": "Доходы",
    "reports": "Отчёты",
    "total": "Итого",
    "period": "Период",
    "amount": "Сумма",
    "paid": "Оплачено",
    "pendingPayment": "Ожидает оплаты"
  },
  "ai": {
    "title": "AI Ассистент",
    "placeholder": "Напишите сообщение...",
    "send": "Отправить",
    "thinking": "Думаю...",
    "actionCompleted": "Действие выполнено"
  },
  "notifications": {
    "title": "Уведомления",
    "markRead": "Прочитано",
    "markAllRead": "Прочитать все",
    "empty": "Нет новых уведомлений"
  },
  "common": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "edit": "Редактировать",
    "search": "Поиск",
    "filter": "Фильтр",
    "loading": "Загрузка...",
    "error": "Ошибка",
    "success": "Успешно",
    "confirm": "Подтвердить",
    "back": "Назад",
    "today": "Сегодня",
    "thisWeek": "Эта неделя",
    "thisMonth": "Этот месяц"
  }
}
```

Create: `frontend/src/i18n/index.ts`
```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./ru.json";

i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru } },
  lng: "ru",
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

export default i18n;
```

**Step 5: Create TypeScript types**

Create: `frontend/src/types/index.ts`
```typescript
export type Role = "owner" | "manager" | "driver" | "chef" | "assistant" | "cleaner";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "done";
export type ScheduleStatus = "scheduled" | "completed" | "cancelled";
export type PayrollStatus = "pending" | "paid";
export type ExpenseCategory = "household" | "transport" | "food" | "entertainment" | "other";
export type NotificationType = "schedule" | "task" | "payment" | "system";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Schedule {
  id: number;
  user_id: number;
  user?: User;
  date: string;
  shift_start: string;
  shift_end: string;
  location: string;
  notes: string | null;
  status: ScheduleStatus;
}

export interface Task {
  id: number;
  assigned_to: number;
  assignee?: User;
  created_by: number | null;
  created_by_ai: boolean;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
}

export interface Payroll {
  id: number;
  user_id: number;
  user?: User;
  period_start: string;
  period_end: string;
  base_salary: number;
  bonuses: number;
  deductions: number;
  net_amount: number;
  status: PayrollStatus;
  paid_date: string | null;
}

export interface Expense {
  id: number;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  receipt_url: string | null;
  approved_by: number | null;
  created_by: number;
}

export interface Income {
  id: number;
  source: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface AiMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  actions_taken: Record<string, unknown>[] | null;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
```

**Step 6: Set up basic App.tsx with router**

Replace `frontend/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Дом — CRM</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

Update `frontend/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 7: Verify frontend starts**

Run: `cd frontend && npm run dev`
Expected: Vite dev server on port 5173, page shows "Дом — CRM"

**Step 8: Commit**
```bash
git add frontend/
git commit -m "feat: initialize frontend with Vite, React, Tailwind, Russian i18n"
```

---

### Task 0.3: Database Models & First Migration

**Files:**
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/schedule.py`
- Create: `backend/app/models/task.py`
- Create: `backend/app/models/finance.py`
- Create: `backend/app/models/ai.py`
- Create: `backend/app/models/notification.py`
- Create: `backend/app/models/__init__.py`

**Step 1: Create User model**

```python
# backend/app/models/user.py
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RoleEnum(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    driver = "driver"
    chef = "chef"
    assistant = "assistant"
    cleaner = "cleaner"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum))
    phone: Mapped[str | None] = mapped_column(String(50))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

**Step 2: Create Schedule model**

```python
# backend/app/models/schedule.py
import enum
from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScheduleStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date: Mapped[date] = mapped_column(Date)
    shift_start: Mapped[time] = mapped_column(Time)
    shift_end: Mapped[time] = mapped_column(Time)
    location: Mapped[str] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[ScheduleStatus] = mapped_column(Enum(ScheduleStatus), default=ScheduleStatus.scheduled)

    user = relationship("User")


class ScheduleChangeRequest(Base):
    __tablename__ = "schedule_change_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    original_schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))
    requested_date: Mapped[date] = mapped_column(Date)
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
```

**Step 3: Create Task model**

```python
# backend/app/models/task.py
import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class StatusEnum(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    assigned_to: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_by_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(2000))
    priority: Mapped[PriorityEnum] = mapped_column(Enum(PriorityEnum), default=PriorityEnum.medium)
    status: Mapped[StatusEnum] = mapped_column(Enum(StatusEnum), default=StatusEnum.pending)
    due_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
```

**Step 4: Create Finance models**

```python
# backend/app/models/finance.py
import enum
from datetime import date, datetime

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


class Payroll(Base):
    __tablename__ = "payroll"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    base_salary: Mapped[float] = mapped_column(Numeric(12, 2))
    bonuses: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    deductions: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    net_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[PayrollStatus] = mapped_column(Enum(PayrollStatus), default=PayrollStatus.pending)
    paid_date: Mapped[date | None] = mapped_column(Date)

    user = relationship("User")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory))
    description: Mapped[str] = mapped_column(String(500))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    date: Mapped[date] = mapped_column(Date)
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    approver = relationship("User", foreign_keys=[approved_by])
    creator = relationship("User", foreign_keys=[created_by])


class Income(Base):
    __tablename__ = "income"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(500))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    date: Mapped[date] = mapped_column(Date)
    category: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

**Step 5: Create AI models**

```python
# backend/app/models/ai.py
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User")
    messages = relationship("AiMessage", back_populates="conversation")


class AiMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("ai_conversations.id"))
    role: Mapped[str] = mapped_column(String(20))  # user | assistant
    content: Mapped[str] = mapped_column(String(10000))
    actions_taken: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    conversation = relationship("AiConversation", back_populates="messages")
```

**Step 6: Create Notification model**

```python
# backend/app/models/notification.py
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NotificationType(str, enum.Enum):
    schedule = "schedule"
    task = "task"
    payment = "payment"
    system = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(String(1000))
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    channel: Mapped[str] = mapped_column(String(20), default="in_app")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

**Step 7: Create `__init__.py` that imports all models**

```python
# backend/app/models/__init__.py
from app.models.user import User, RoleEnum
from app.models.schedule import Schedule, ScheduleChangeRequest, ScheduleStatus
from app.models.task import Task, PriorityEnum, StatusEnum
from app.models.finance import Payroll, Expense, Income, PayrollStatus, ExpenseCategory
from app.models.ai import AiConversation, AiMessage
from app.models.notification import Notification, NotificationType

__all__ = [
    "User", "RoleEnum",
    "Schedule", "ScheduleChangeRequest", "ScheduleStatus",
    "Task", "PriorityEnum", "StatusEnum",
    "Payroll", "Expense", "Income", "PayrollStatus", "ExpenseCategory",
    "AiConversation", "AiMessage",
    "Notification", "NotificationType",
]
```

**Step 8: Initialize Alembic and create first migration**

Run:
```bash
cd backend
alembic init alembic
```

Edit `alembic/env.py` to import models and use `Base.metadata`:
```python
from app.database import Base
from app.models import *  # noqa: F401, F403
target_metadata = Base.metadata
```

Edit `alembic.ini` to set `sqlalchemy.url = postgresql://dom:dom@localhost:5432/dom`

Run:
```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

**Step 9: Commit**
```bash
git add backend/
git commit -m "feat: add all database models and initial migration"
```

---

### Task 0.4: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `nginx/nginx.conf`
- Create: `.env.example`

**Step 1: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dom
      POSTGRES_PASSWORD: dom
      POSTGRES_DB: dom
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://dom:dom@db:5432/dom
      SECRET_KEY: ${SECRET_KEY:-change-me-in-production}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
    depends_on:
      - db
    ports:
      - "8000:8000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
    depends_on:
      - app

volumes:
  pgdata:
```

**Step 2: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "app.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

**Step 3: Create `nginx/nginx.conf`**

```nginx
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;

        location /api {
            proxy_pass http://app:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /ws {
            proxy_pass http://app:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

**Step 4: Create `.env.example`**

```
SECRET_KEY=your-secret-key-here
DEEPSEEK_API_KEY=your-deepseek-key
RESEND_API_KEY=your-resend-key
```

**Step 5: Verify Docker Compose starts**

Run: `docker compose up -d db` then verify postgres is reachable.

**Step 6: Commit**
```bash
git add docker-compose.yml backend/Dockerfile nginx/ .env.example
git commit -m "feat: add Docker Compose setup with Postgres, Nginx, and app service"
```

---

## Phase 1: Authentication & Layout (Parallel — Backend + Frontend)

> **Backend Agent:** Tasks 1.1-1.2
> **Frontend Agent:** Tasks 1.3-1.5
> Both can work simultaneously after Phase 0.

### Task 1.1: Backend Auth — Security Utils + Auth Service

**Files:**
- Create: `backend/app/utils/security.py`
- Create: `backend/app/services/auth.py`
- Create: `backend/app/schemas/user.py`
- Test: `backend/tests/test_auth.py`

Implement:
- `hash_password(password)` and `verify_password(password, hash)` using passlib bcrypt
- `create_access_token(data, expires_delta)` and `create_refresh_token(data)` using python-jose
- `get_current_user(token)` dependency that decodes JWT and fetches user from DB
- Pydantic schemas: `UserCreate`, `UserLogin`, `UserResponse`, `TokenResponse`

Test: Register user, login, verify token returns correct user, expired token returns 401.

### Task 1.2: Backend Auth — Router + RBAC Middleware

**Files:**
- Create: `backend/app/routers/auth.py`
- Create: `backend/app/middleware/rbac.py`

Implement:
- `POST /api/auth/register` — create user (owner-only endpoint for creating staff accounts)
- `POST /api/auth/login` — email + password → access_token + refresh_token
- `POST /api/auth/refresh` — refresh_token → new access_token
- `GET /api/auth/me` — return current user profile
- RBAC dependency: `require_role(*roles)` returns a FastAPI dependency that checks user role
- Seed initial owner account on first run via startup event

Wire routers into `main.py`.

### Task 1.3: Frontend — API Client + Auth Store

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/store/authStore.ts`
- Create: `frontend/src/hooks/useAuth.ts`

Implement:
- Axios instance with JWT interceptor (attach token to requests, handle 401 → refresh)
- Auth API functions: `login(email, password)`, `refreshToken()`, `getMe()`
- Zustand auth store: `user`, `tokens`, `login()`, `logout()`, `isAuthenticated`
- `useAuth()` hook wrapping the store

### Task 1.4: Frontend — Login Page

**Files:**
- Create: `frontend/src/pages/Login.tsx`

Implement:
- Email + password form with Russian labels
- Error handling (wrong credentials message in Russian)
- Redirect to dashboard on success
- Clean, centered card layout with Tailwind

### Task 1.5: Frontend — Layout Shell + Routing

**Files:**
- Create: `frontend/src/components/layout/Layout.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/MobileNav.tsx`
- Create: `frontend/src/components/shared/RoleGuard.tsx`
- Create: `frontend/src/store/themeStore.ts`
- Modify: `frontend/src/App.tsx`

Implement:
- Sidebar with nav items that change based on user role (owner/manager see admin nav, staff see personal nav)
- Header with user name, role badge, notification bell, dark mode toggle, logout
- Mobile hamburger menu
- RoleGuard component that conditionally renders children based on role
- Dark mode via Tailwind `dark:` classes and theme store
- Route structure with all page placeholders (empty components that just show page title)

**Commit after Phase 1:**
```bash
git add -A
git commit -m "feat: add authentication system, layout shell, and routing"
```

---

## Phase 2: Core CRUD Features (Parallel — Backend + Frontend)

> **Backend Agent:** Tasks 2.1-2.5
> **Frontend Agent:** Tasks 2.6-2.10
> Both work simultaneously. Frontend uses mock data initially, then connects to real API.

### Task 2.1: Backend — Users CRUD

**Files:**
- Create: `backend/app/routers/users.py`
- Create: `backend/app/schemas/user.py` (extend)

Endpoints:
- `GET /api/users` — list all users (owner/manager only)
- `GET /api/users/{id}` — get user by ID
- `PUT /api/users/{id}` — update user (owner/manager only)
- `DELETE /api/users/{id}` — deactivate user (owner only)

### Task 2.2: Backend — Schedules CRUD

**Files:**
- Create: `backend/app/routers/schedules.py`
- Create: `backend/app/schemas/schedule.py`

Endpoints:
- `GET /api/schedules` — list schedules (filter by user_id, date range). Staff see only own.
- `POST /api/schedules` — create schedule (owner/manager)
- `PUT /api/schedules/{id}` — update schedule (owner/manager)
- `DELETE /api/schedules/{id}` — cancel schedule (owner/manager)
- `POST /api/schedules/change-request` — staff request schedule change
- `PUT /api/schedules/change-request/{id}` — approve/reject (owner/manager)

### Task 2.3: Backend — Tasks CRUD

**Files:**
- Create: `backend/app/routers/tasks.py`
- Create: `backend/app/schemas/task.py`

Endpoints:
- `GET /api/tasks` — list tasks (filter by assigned_to, status, priority). Staff see only own.
- `POST /api/tasks` — create task (owner/manager/ai)
- `PUT /api/tasks/{id}` — update task. Staff can only update status of own tasks.
- `DELETE /api/tasks/{id}` — delete task (owner/manager)

### Task 2.4: Backend — Finance CRUD

**Files:**
- Create: `backend/app/routers/finance.py`
- Create: `backend/app/schemas/finance.py`

Endpoints:
- `GET /api/payroll` — list payroll records (owner/manager see all, staff see own)
- `POST /api/payroll` — create payroll record (owner only)
- `PUT /api/payroll/{id}` — update (mark as paid, etc.) (owner only)
- `GET /api/expenses` — list expenses (owner/manager)
- `POST /api/expenses` — create expense (owner/manager)
- `GET /api/income` — list income (owner/manager)
- `POST /api/income` — create income (owner/manager)
- `GET /api/finance/summary` — monthly/yearly summary with totals (owner/manager)

### Task 2.5: Backend — Notifications CRUD

**Files:**
- Create: `backend/app/routers/notifications.py`
- Create: `backend/app/schemas/notification.py`
- Create: `backend/app/services/notification.py`

Endpoints:
- `GET /api/notifications` — get user's notifications (paginated, filtered by type)
- `PUT /api/notifications/{id}/read` — mark as read
- `PUT /api/notifications/read-all` — mark all as read
- Service function: `create_notification(user_id, title, message, type, channel)`

### Task 2.6: Frontend — Staff Management Page

**Files:**
- Create: `frontend/src/pages/owner/Staff.tsx`
- Create: `frontend/src/api/users.ts`

Implement:
- Table listing all staff with name, role, phone, email, status
- "Добавить сотрудника" button → modal with form
- Edit/deactivate actions per row
- Role badges with colors
- Search/filter by role

### Task 2.7: Frontend — Schedules Page (Calendar View)

**Files:**
- Create: `frontend/src/pages/owner/Schedules.tsx`
- Create: `frontend/src/api/schedules.ts`

Implement:
- Weekly calendar grid showing shifts
- Color-coded by staff member
- Click to add new shift → modal form
- Edit/cancel existing shifts
- Filter by staff member
- Staff version (`MySchedule.tsx`) shows only own schedule + request change button

### Task 2.8: Frontend — Tasks Page (Kanban Board)

**Files:**
- Create: `frontend/src/pages/owner/Tasks.tsx`
- Create: `frontend/src/api/tasks.ts`
- Create: `frontend/src/pages/staff/MyTasks.tsx`

Implement:
- Three columns: Ожидает | В работе | Готово
- Task cards with title, assignee, priority badge, due date
- Drag-and-drop between columns (or click to change status)
- "Новая задача" button → modal form
- Staff version shows only their tasks with status toggle

### Task 2.9: Frontend — Finance Page

**Files:**
- Create: `frontend/src/pages/owner/Finance.tsx`
- Create: `frontend/src/api/finance.ts`
- Create: `frontend/src/pages/staff/MyPay.tsx`

Implement:
- 4 tabs: Зарплаты | Расходы | Доходы | Отчёты
- Payroll tab: table with staff, period, amount, status (paid/pending)
- Expenses tab: table with category, amount, date + add button
- Income tab: table with source, amount, date + add button
- Reports tab: Recharts — monthly income vs expenses bar chart, expense by category pie chart
- Staff `MyPay.tsx`: simple list of their payment history

### Task 2.10: Frontend — Notifications + Dashboard

**Files:**
- Create: `frontend/src/pages/owner/Notifications.tsx`
- Create: `frontend/src/pages/owner/Dashboard.tsx`
- Create: `frontend/src/pages/staff/MyDay.tsx`
- Create: `frontend/src/api/notifications.ts`
- Create: `frontend/src/components/shared/NotificationBell.tsx`

Implement:
- Notifications page: list with read/unread styling, mark read, filter by type
- NotificationBell: shows unread count badge in header, dropdown with recent notifications
- Owner Dashboard: today's staff on duty, pending tasks count, this month's expenses, recent activity
- Staff MyDay: today's schedule, active tasks, quick AI chat access

**Commit after Phase 2:**
```bash
git add -A
git commit -m "feat: add all CRUD endpoints and frontend pages"
```

---

## Phase 3: AI Integration (Backend Agent + AI Agent collaborate)

> **AI Agent:** Tasks 3.1-3.3
> Depends on Phase 2 backend endpoints existing.

### Task 3.1: Backend — DeepSeek Client + Tool Definitions

**Files:**
- Create: `backend/app/services/ai_agent.py`
- Create: `backend/app/services/ai_tools.py`

Implement `ai_tools.py`:
- Define all 15 tool functions (list_staff, get_schedule, create_schedule, etc.)
- Each tool is a regular Python function that takes a `db: Session` and params, executes DB query, returns result dict
- Tool definitions in OpenAI function-calling format for DeepSeek:
```python
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
                }
            }
        }
    },
    # ... all other tools
]

STAFF_TOOLS = [
    # Only: get_my_tasks, get_my_schedule, get_my_payroll, update_task (own), create_schedule_change_request
]
```

Implement `ai_agent.py`:
- `DeepSeekAgent` class with `async def chat(user, message, conversation_id, db)` method
- Sends message + tool definitions to DeepSeek V3.2 API via httpx
- Handles function calling loop: if model returns tool_calls, execute them, feed results back
- Selects tool set based on user role (OWNER_TOOLS vs STAFF_TOOLS)
- Logs all actions to ai_messages table
- System prompt in Russian explaining the assistant's role

### Task 3.2: Backend — WebSocket Chat Endpoint

**Files:**
- Create: `backend/app/routers/ai_chat.py`

Implement:
- `WebSocket /ws/chat` endpoint
- Authenticate via token query param
- On message: create/resume conversation, call DeepSeekAgent.chat(), stream response back
- Send action cards as structured JSON messages when AI executes tools
- Handle connection lifecycle (connect/disconnect/error)

Wire into `main.py`.

### Task 3.3: Frontend — AI Chat Panel

**Files:**
- Create: `frontend/src/components/ai/ChatPanel.tsx`
- Create: `frontend/src/components/ai/ChatMessage.tsx`
- Create: `frontend/src/components/ai/ActionCard.tsx`
- Create: `frontend/src/hooks/useWebSocket.ts`
- Create: `frontend/src/store/chatStore.ts`
- Create: `frontend/src/api/ai.ts`
- Create: `frontend/src/pages/staff/AiChat.tsx`

Implement:
- `useWebSocket` hook: connect to `/ws/chat`, handle messages, reconnect on disconnect
- `chatStore`: messages array, active conversation, isTyping state
- `ChatPanel`: collapsible right sidebar panel (for owner/manager), shows in layout
- `ChatMessage`: renders user/assistant messages with markdown support
- `ActionCard`: when AI performs an action, show a card with action type + details (e.g., "Создано расписание: Иван, завтра 15:00, студия")
- `AiChat` page: full-screen version for staff (same chat components, different layout)
- Text input with send button, "Думаю..." indicator while waiting

**Commit after Phase 3:**
```bash
git add -A
git commit -m "feat: add AI assistant with DeepSeek function calling and chat UI"
```

---

## Phase 4: Email Notifications + Polish

> **Backend Agent:** Task 4.1
> **Frontend Agent:** Task 4.2

### Task 4.1: Backend — Email Service (Resend)

**Files:**
- Create: `backend/app/services/email.py`
- Modify: `backend/app/services/notification.py`

Implement:
- `send_email(to, subject, html_body)` using Resend SDK
- Email templates (simple HTML): schedule notification, task assignment, payment confirmation
- Modify notification service: when channel is "email" or "both", also send email
- Graceful fallback if Resend key not configured (log warning, skip email)

### Task 4.2: Frontend — Polish & Mobile

- Verify all pages are mobile-responsive (test at 375px width)
- Dark mode works on all pages (check contrast)
- Loading states on all data-fetching pages
- Empty states with Russian text ("Нет данных", "Нет задач на сегодня")
- Error boundaries with Russian error messages

**Commit after Phase 4:**
```bash
git add -A
git commit -m "feat: add email notifications and UI polish"
```

---

## Phase 5: Review & Security Audit

> **Review Agent:** Tasks 5.1-5.3
> Runs after all features are built.

### Task 5.1: Security Audit

Check for:
- SQL injection (should be prevented by SQLAlchemy ORM)
- JWT secret strength and token expiration
- Password hashing (bcrypt rounds)
- CORS configuration (tighten for production)
- Input validation on all endpoints (Pydantic)
- WebSocket authentication
- File upload sanitization (receipt_url)
- Rate limiting on auth endpoints
- RBAC enforcement on every endpoint
- AI tool execution — ensure staff can't escalate via prompt injection

### Task 5.2: Vercel React Best Practices

Run `vercel:react-best-practices` skill against the frontend codebase. Check:
- No request waterfalls
- Bundle size optimization (lazy loading routes)
- Proper use of React Query (no redundant fetches)
- No unnecessary re-renders
- Proper key usage in lists

### Task 5.3: Refactoring

- DRY up repeated patterns
- Ensure consistent error handling
- Remove dead code
- Verify all Russian translations are complete
- Check TypeScript strict mode compliance

**Commit after Phase 5:**
```bash
git add -A
git commit -m "refactor: security audit fixes and React best practices"
```

---

## Phase 6: Deployment

### Task 6.1: Production Docker Build

- Build frontend: `cd frontend && npm run build`
- Build Docker images: `docker compose build`
- Run Alembic migrations in production
- Seed owner account
- Configure .env with real secrets

### Task 6.2: Deploy to VPS

- Copy project to VPS
- Start Docker Compose
- Verify all endpoints work
- Test AI chat with DeepSeek

---

## Agent Assignment Summary

| Agent | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|-------|---------|---------|---------|---------|---------|---------|
| **Backend** | 0.1, 0.3, 0.4 | 1.1, 1.2 | 2.1-2.5 | — | 4.1 | — |
| **Frontend** | 0.2 | 1.3-1.5 | 2.6-2.10 | — | 4.2 | — |
| **AI** | — | — | — | 3.1-3.3 | — | — |
| **Review** | — | — | — | — | — | 5.1-5.3 |

**Dependency chain:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Within each phase, Backend and Frontend tasks run in parallel.
