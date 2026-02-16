import { useState, type FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const registered = (location.state as { registered?: boolean })?.registered;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError(t("auth.invalidCredentials"));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 mesh-gradient-bg">
      {/* Floating orbs */}
      <div className="orb animate-float-1 w-[400px] h-[400px] bg-purple-600 top-[10%] left-[10%]" />
      <div className="orb animate-float-2 w-[300px] h-[300px] bg-blue-600 bottom-[10%] right-[15%]" />
      <div className="orb animate-float-3 w-[250px] h-[250px] bg-cyan-500 top-[50%] left-[50%]" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={24} className="text-blue-400 animate-glow-pulse" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {t("app.name")}
            </h1>
          </div>
          <p className="text-sm text-gray-400">
            {t("auth.loginTitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-modal rounded-2xl p-6 space-y-4"
        >
          {registered && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              {t("auth.registerSuccess")}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-purple-200 placeholder-gray-500 glass-input focus:outline-none"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-purple-200 placeholder-gray-500 glass-input focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
          >
            {isLoading ? t("common.loading") : t("auth.login")}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              {t("auth.register")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
