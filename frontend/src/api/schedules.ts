import client from "./client";
import type { Schedule } from "../types";

interface ScheduleParams {
  user_id?: number;
  date_from?: string;
  date_to?: string;
}

interface ScheduleCreate {
  user_id: number;
  date: string;
  shift_start: string;
  shift_end: string;
  location: string;
  notes?: string;
}

export async function getSchedules(params?: ScheduleParams): Promise<Schedule[]> {
  const response = await client.get<Schedule[]>("/schedules", { params });
  return response.data;
}

export async function createSchedule(data: ScheduleCreate): Promise<Schedule> {
  const response = await client.post<Schedule>("/schedules", data);
  return response.data;
}

export async function updateSchedule(id: number, data: Partial<ScheduleCreate>): Promise<Schedule> {
  const response = await client.put<Schedule>(`/schedules/${id}`, data);
  return response.data;
}

export async function deleteSchedule(id: number): Promise<void> {
  await client.delete(`/schedules/${id}`);
}

export async function createChangeRequest(data: {
  original_schedule_id: number;
  requested_date: string;
  reason: string;
}): Promise<void> {
  await client.post("/schedules/change-request", data);
}
