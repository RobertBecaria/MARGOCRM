import client from "./client";
import type { FinanceCategory } from "../types";

export async function getCategories(type?: "expense" | "income"): Promise<FinanceCategory[]> {
  const params = type ? { type } : {};
  const response = await client.get<FinanceCategory[]>("/categories", { params });
  return response.data;
}

export async function createCategory(data: { name: string; type: "expense" | "income" }): Promise<FinanceCategory> {
  const response = await client.post<FinanceCategory>("/categories", data);
  return response.data;
}

export async function updateCategory(id: number, data: { name: string }): Promise<FinanceCategory> {
  const response = await client.put<FinanceCategory>(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await client.delete(`/categories/${id}`);
}
