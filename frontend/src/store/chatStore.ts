import { create } from "zustand";
import type { AiMessage } from "../types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Record<string, unknown>[];
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  activeConversationId: number | null;
  isTyping: boolean;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  setTyping: (typing: boolean) => void;
  setConversationId: (id: number) => void;
  loadMessages: (messages: AiMessage[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeConversationId: null,
  isTyping: false,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  clearMessages: () => set({ messages: [], activeConversationId: null }),

  setTyping: (typing) => set({ isTyping: typing }),

  setConversationId: (id) => set({ activeConversationId: id }),

  loadMessages: (messages) =>
    set({
      messages: messages.map((m) => ({
        id: String(m.id),
        role: m.role as "user" | "assistant",
        content: m.content,
        actions: m.actions_taken || undefined,
        timestamp: m.created_at,
      })),
    }),
}));
