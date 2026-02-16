import client from "./client";
import type { AuthTokens, Role, User } from "../types";

export async function login(email: string, password: string): Promise<AuthTokens> {
  const response = await client.post<AuthTokens>("/auth/login", { email, password });
  return response.data;
}

export async function refreshToken(refresh_token: string): Promise<AuthTokens> {
  const response = await client.post<AuthTokens>("/auth/refresh", { refresh_token });
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await client.get<User>("/auth/me");
  return response.data;
}

export async function signup(data: {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  phone?: string;
}): Promise<User> {
  const response = await client.post<User>("/auth/signup", data);
  return response.data;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await client.post("/auth/change-password", { current_password, new_password });
}
