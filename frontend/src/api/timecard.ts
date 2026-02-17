import client from "./client";

export interface TimeCard {
  id: number;
  user_id: number;
  date: string;
  clock_in: string;
  clock_out: string | null;
  device_type: string;
  is_ipad: boolean;
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const maxTouch = navigator.maxTouchPoints || 0;
  return `${ua} maxTouchPoints=${maxTouch}`;
}

export async function clockIn(): Promise<TimeCard> {
  const response = await client.post<TimeCard>("/timecards/clock-in", {
    device_info: getDeviceInfo(),
  });
  return response.data;
}

export async function clockOut(): Promise<TimeCard> {
  const response = await client.post<TimeCard>("/timecards/clock-out", {
    device_info: getDeviceInfo(),
  });
  return response.data;
}

export async function getTodayStatus(): Promise<TimeCard | null> {
  const response = await client.get<TimeCard | null>("/timecards/today");
  return response.data;
}

export async function getTimecards(params?: { user_id?: number; date_from?: string; date_to?: string }): Promise<TimeCard[]> {
  const response = await client.get<TimeCard[]>("/timecards", { params });
  return response.data;
}
