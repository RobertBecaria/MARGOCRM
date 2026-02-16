import client from "./client";
import type { AiMessage } from "../types";

interface AiConversation {
  id: number;
  user_id: number;
  created_at: string;
}

export async function getConversations(): Promise<AiConversation[]> {
  const response = await client.get<AiConversation[]>("/ai/conversations");
  return response.data;
}

export async function getMessages(conversationId: number): Promise<AiMessage[]> {
  const response = await client.get<AiMessage[]>(`/ai/conversations/${conversationId}/messages`);
  return response.data;
}
