# Household Staff CRM — Design Document

**Date:** 2026-02-16
**Project codename:** Dom (Household Staff CRM)
**Status:** Approved

## Overview

A CRM application for a popular singer to manage her household staff (3 drivers, chef, business manager, personal assistant, cleaner), payroll, finances, and an AI assistant powered by DeepSeek V3.2 that acts as a full autonomous manager.

## Architecture

**Monolith approach:** Single FastAPI backend + React SPA frontend + AI chat panel.

```
[React SPA (Vite)] <--REST/WebSocket--> [FastAPI Monolith] <--> [PostgreSQL 16]
                                              |
                                         [DeepSeek V3.2 API]
                                              |
                                         [Resend Email API]
```

**Deployment:** Docker Compose on VPS (1 vCPU, 4GB RAM, 40GB SSD)
- nginx: reverse proxy + serves React static build
- app: FastAPI via Gunicorn/Uvicorn
- db: PostgreSQL 16

## Data Model

### Users & Roles
- `users` — id, email, password_hash, full_name, role (owner/manager/driver/chef/assistant/cleaner), phone, avatar_url, is_active, created_at
- 6 roles: owner (full access), manager (near-full), driver/chef/assistant/cleaner (self-service)

### Staff Management
- `schedules` — id, user_id (FK), date, shift_start, shift_end, location, notes, status (scheduled/completed/cancelled)
- `tasks` — id, assigned_to (FK), created_by (FK or 'ai'), title, description, priority (low/medium/high/urgent), status (pending/in_progress/done), due_date, created_at
- `schedule_change_requests` — id, user_id (FK), original_schedule_id (FK), requested_date, reason, status (pending/approved/rejected), reviewed_by

### Finance / Payroll
- `payroll` — id, user_id (FK), period_start, period_end, base_salary, bonuses, deductions, net_amount, status (pending/paid), paid_date
- `expenses` — id, category (household/transport/food/entertainment/other), description, amount, date, receipt_url, approved_by, created_by
- `income` — id, source, description, amount, date, category

### AI
- `ai_conversations` — id, user_id (FK), created_at
- `ai_messages` — id, conversation_id (FK), role (user/assistant), content, actions_taken (JSON), created_at

### Notifications
- `notifications` — id, user_id (FK), title, message, type (schedule/task/payment/system), is_read, channel (in_app/email/both), created_at

## AI Agent Architecture

### Function Calling Pattern
DeepSeek V3.2 receives available tools and decides which to call based on user messages. Backend executes functions against the database.

### Available AI Tools
- `list_staff` — Get all staff or filter by role
- `get_schedule` — View schedules for person/date range
- `create_schedule` — Assign staff member to a shift
- `update_schedule` — Modify or cancel a shift
- `create_task` — Assign a task to staff
- `update_task` — Change task status/priority
- `get_expenses` — View expenses with filters
- `create_expense` — Log a new expense
- `get_payroll_summary` — View payroll for a period
- `get_financial_summary` — Monthly/yearly income vs expenses
- `send_notification` — Notify a staff member
- `get_my_tasks` — Staff-scoped: get own tasks
- `get_my_schedule` — Staff-scoped: get own schedule
- `get_my_payroll` — Staff-scoped: get own payment history
- `create_schedule_change_request` — Staff-scoped: request shift swap

### Role-Scoped AI Access
| Role | AI Can Do |
|------|-----------|
| Owner | Everything — full CRM control, financials, all staff data |
| Manager | Everything except delete users and modify payroll amounts |
| Staff | Own tasks, own schedule, own pay, request schedule changes |

### Safety Guardrails
- All AI actions logged in ai_messages.actions_taken (audit trail)
- Destructive actions require human confirmation
- Staff AI tools enforce user=self at backend level
- Rate limiting on AI API calls

## Frontend Design

### Tech Stack
- React 18 + Vite
- Tailwind CSS
- React Router
- Zustand (state management)
- TanStack Query (data fetching)
- Recharts (financial charts)
- react-i18next (Russian localization)
- date-fns (Russian locale)

### Pages — Owner/Manager
- Home (today's overview + AI chat)
- Staff (list, profiles, roles)
- Schedules (calendar view)
- Tasks (kanban board)
- Finance (payroll/expenses/income/reports tabs)
- Notifications (inbox)
- Settings (profile, preferences)

### Pages — Staff
- My Day (today's schedule + tasks)
- My Schedule (personal calendar, read-only + change requests)
- My Tasks (personal task list with status toggles)
- My Pay (payment history, read-only)
- AI Chat (full-screen scoped chat)

### UI
- Russian language throughout
- Clean, modern, minimal (Linear/Notion aesthetic)
- Dark mode support
- Mobile-responsive
- AI chat as collapsible right-side panel

## Backend Design

### Tech Stack
- FastAPI (Python 3.11+)
- SQLAlchemy + Alembic (ORM + migrations)
- PostgreSQL 16
- Pydantic (validation)
- python-jose (JWT)
- Resend (email, free tier 3k/month)
- httpx (async DeepSeek API calls)
- Gunicorn + Uvicorn (production server)

### Authentication
- Email + password with JWT tokens
- Role-based access control (RBAC) on all endpoints
- Refresh token rotation

## Agent Team

Building with 4 parallel agents:
1. **Frontend Agent** — React UI, components, pages, Tailwind, i18n
2. **Backend Agent** — FastAPI, models, endpoints, auth, migrations
3. **AI Agent** — DeepSeek integration, function calling, chat WebSocket
4. **Review Agent** — Security audit, refactoring, Vercel React best practices
