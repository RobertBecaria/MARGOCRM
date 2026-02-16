import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const loadUser = useAuthStore((s) => s.loadUser);

  return {
    user,
    tokens,
    isLoading,
    isAuthenticated: tokens !== null,
    login,
    logout,
    loadUser,
  };
}
