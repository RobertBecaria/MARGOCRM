import { create } from "zustand";

interface ThemeState {
  dark: boolean;
}

// Always dark
document.documentElement.classList.add("dark");
localStorage.setItem("theme", "dark");

export const useThemeStore = create<ThemeState>(() => ({
  dark: true,
}));
