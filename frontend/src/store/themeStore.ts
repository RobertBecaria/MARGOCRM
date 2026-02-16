import { create } from "zustand";

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

function getInitialDark(): boolean {
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem("theme", dark ? "dark" : "light");
}

const initialDark = getInitialDark();
applyTheme(initialDark);

export const useThemeStore = create<ThemeState>((set) => ({
  dark: initialDark,
  toggle: () =>
    set((state) => {
      const next = !state.dark;
      applyTheme(next);
      return { dark: next };
    }),
}));
