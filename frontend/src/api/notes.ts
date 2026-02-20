import client from "./client";
import type { Note } from "../types";

export async function getNotes(search?: string): Promise<Note[]> {
  const response = await client.get<Note[]>("/notes", { params: { search } });
  return response.data;
}

export async function createNote(data: { title: string; content: string; color: string }): Promise<Note> {
  const response = await client.post<Note>("/notes", data);
  return response.data;
}

export async function updateNote(id: number, data: { title?: string; content?: string; color?: string }): Promise<Note> {
  const response = await client.put<Note>(`/notes/${id}`, data);
  return response.data;
}

export async function deleteNote(id: number): Promise<void> {
  await client.delete(`/notes/${id}`);
}
