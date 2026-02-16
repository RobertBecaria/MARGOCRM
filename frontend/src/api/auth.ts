import client from "./client";
import type { AuthTokens, User } from "../types";

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
