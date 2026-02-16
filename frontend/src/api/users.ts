import client from "./client";
import type { Role, User } from "../types";

interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  phone?: string;
}

export async function getUsers(role?: Role): Promise<User[]> {
  const params = role ? { role } : {};
  const response = await client.get<User[]>("/users", { params });
  return response.data;
}

export async function getUser(id: number): Promise<User> {
  const response = await client.get<User>(`/users/${id}`);
  return response.data;
}

export async function createUser(data: UserCreate): Promise<User> {
  const response = await client.post<User>("/auth/register", data);
  return response.data;
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const response = await client.put<User>(`/users/${id}`, data);
  return response.data;
}

export async function deactivateUser(id: number): Promise<void> {
  await client.delete(`/users/${id}`);
}
