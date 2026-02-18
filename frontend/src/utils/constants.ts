import type { TaskPriority, TaskStatus } from "../types";

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
