import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { signup } from "../api/auth";
import type { Role } from "../types";

const ROLES: { value: Role; labelKey: string }[] = [
  { value: "manager", labelKey: "roles.manager" },
  { value: "driver", labelKey: "roles.driver" },
  { value: "chef", labelKey: "roles.chef" },
  { value: "assistant", labelKey: "roles.assistant" },
  { value: "cleaner", labelKey: "roles.cleaner" },
];

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("assistant");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await signup({ email, password, full_name: fullName, role, phone: phone || undefined });
      navigate("/login", { state: { registered: true } });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      if (msg === "Email already registered") {
        setError(t("auth.emailTaken"));
      } else {
        setError(msg || t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 mesh-gradient-bg py-8">
      {/* Floating orbs */}
      <div className="orb animate-float-1 w-[400px] h-[400px] bg-purple-600 top-[5%] right-[10%]" />
      <div className="orb animate-float-2 w-[350px] h-[350px] bg-blue-600 bottom-[5%] left-[10%]" />
      <div className="orb animate-float-3 w-[200px] h-[200px] bg-cyan-500 top-[40%] left-[30%]" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={24} className="text-blue-400 animate-glow-pulse" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {t("app.name")}
            </h1>
          </div>
          <p className="text-sm text-gray-400">
            {t("auth.registerTitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-modal rounded-2xl p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">
              {t("auth.fullName")}
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 glass-input focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 glass-input focus:outline-none"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
              {t("auth.selectRole")}
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white glass-input focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
              {t("staff.phone")}
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 glass-input focus:outline-none"
              placeholder="+7 999 123-45-67"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 glass-input focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              {t("auth.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 glass-input focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
          >
            {loading ? t("common.loading") : t("auth.register")}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              {t("auth.login")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
