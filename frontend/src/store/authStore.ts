import { create } from "zustand";
import * as authApi from "../api/auth";
import type { AuthTokens, User } from "../types";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  tokens: JSON.parse(localStorage.getItem("tokens") || "null"),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const tokens = await authApi.login(email, password);
      localStorage.setItem("tokens", JSON.stringify(tokens));
      set({ tokens });

      const user = await authApi.getMe();
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem("tokens");
    localStorage.removeItem("user");
    set({ user: null, tokens: null });
    window.location.href = "/login";
  },

  loadUser: async () => {
    const { tokens } = get();
    if (!tokens) return;
    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  isAuthenticated: () => {
    const { tokens } = get();
    return tokens !== null;
  },
}));
