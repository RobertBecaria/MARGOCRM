import client from "./client";
import type { Payroll, Expense, Income, PayrollStatus, ExpenseCategory } from "../types";

interface PayrollCreate {
  user_id: number;
  period_start: string;
  period_end: string;
  base_salary: number;
  bonuses?: number;
  deductions?: number;
  net_amount: number;
}

interface ExpenseCreate {
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
}

interface IncomeCreate {
  source: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  total_payroll: number;
  balance: number;
  monthly: Array<{ month: string; income: number; expenses: number }>;
  expense_by_category: Array<{ category: string; amount: number }>;
}

export async function getPayroll(params?: { user_id?: number }): Promise<Payroll[]> {
  const response = await client.get<Payroll[]>("/payroll", { params });
  return response.data;
}

export async function createPayroll(data: PayrollCreate): Promise<Payroll> {
  const response = await client.post<Payroll>("/payroll", data);
  return response.data;
}

export async function updatePayroll(id: number, data: { status?: PayrollStatus; paid_date?: string }): Promise<Payroll> {
  const response = await client.put<Payroll>(`/payroll/${id}`, data);
  return response.data;
}

export async function getExpenses(): Promise<Expense[]> {
  const response = await client.get<Expense[]>("/expenses");
  return response.data;
}

export async function createExpense(data: ExpenseCreate): Promise<Expense> {
  const response = await client.post<Expense>("/expenses", data);
  return response.data;
}

export async function getIncome(): Promise<Income[]> {
  const response = await client.get<Income[]>("/income");
  return response.data;
}

export async function createIncome(data: IncomeCreate): Promise<Income> {
  const response = await client.post<Income>("/income", data);
  return response.data;
}

export async function getFinanceSummary(period?: string): Promise<FinanceSummary> {
  const response = await client.get<FinanceSummary>("/finance/summary", { params: { period } });
  return response.data;
}
