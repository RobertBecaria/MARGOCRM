export type Role = "owner" | "manager" | "staff" | "driver" | "chef" | "assistant" | "cleaner";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "done";
export type ScheduleStatus = "scheduled" | "completed" | "cancelled";
export type PayrollStatus = "pending" | "paid";
export type ExpenseCategory = string;
export type NotificationType = "schedule" | "task" | "payment" | "system";

export interface FinanceCategory {
  id: number;
  name: string;
  type: "expense" | "income";
  is_default: boolean;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  phone: string | null;
  position: string | null;
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
  payment_source: string | null;
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
  status: string;
}

export interface Income {
  id: number;
  source: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  receipt_url: string | null;
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
