import client from "./client";
import type { Task, TaskStatus, TaskPriority } from "../types";

interface TaskParams {
  assigned_to?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
}

interface TaskCreate {
  title: string;
  description?: string;
  assigned_to: number;
  priority: TaskPriority;
  due_date?: string;
}

export async function getTasks(params?: TaskParams): Promise<Task[]> {
  const response = await client.get<Task[]>("/tasks", { params });
  return response.data;
}

export async function createTask(data: TaskCreate): Promise<Task> {
  const response = await client.post<Task>("/tasks", data);
  return response.data;
}

export async function updateTask(id: number, data: Partial<TaskCreate & { status: TaskStatus }>): Promise<Task> {
  const response = await client.put<Task>(`/tasks/${id}`, data);
  return response.data;
}

export async function deleteTask(id: number): Promise<void> {
  await client.delete(`/tasks/${id}`);
}
