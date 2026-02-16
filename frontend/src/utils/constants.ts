import type { TaskPriority, TaskStatus, ExpenseCategory } from "../types";

export const PRIORITY_COLOR: Record<TaskPriority, "gray" | "blue" | "orange" | "red"> = {
  low: "gray",
  medium: "blue",
  high: "orange",
  urgent: "red",
};

export const STATUS_FLOW: TaskStatus[] = ["pending", "in_progress", "done"];

export const STATUS_LABEL_KEYS: Record<TaskStatus, string> = {
  pending: "tasks.pending",
  in_progress: "tasks.inProgress",
  done: "tasks.done",
};

export const EXPENSE_CATEGORY_KEYS: Record<ExpenseCategory, string> = {
  household: "finance.catHousehold",
  transport: "finance.catTransport",
  food: "finance.catFood",
  entertainment: "finance.catEntertainment",
  other: "finance.catOther",
};
