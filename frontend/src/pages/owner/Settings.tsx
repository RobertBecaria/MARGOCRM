import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useThemeStore } from "../../store/themeStore";
import { updateUser } from "../../api/users";
import { changePassword } from "../../api/auth";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function Settings() {
  const { t } = useTranslation();
  const { user, loadUser } = useAuth();
  const { dark, toggle } = useThemeStore();

  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const saveMut = useMutation({
    mutationFn: () =>
      updateUser(user!.id, { full_name: name, phone: phone || null }),
    onSuccess: async () => {
      await loadUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const pwdMut = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPwdMsg({ type: "success", text: t("settings.passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPwdMsg(null), 3000);
    },
    onError: () => {
      setPwdMsg({ type: "error", text: t("settings.wrongPassword") });
    },
  });

  function handleChangePassword() {
    setPwdMsg(null);
    if (newPassword !== confirmNewPassword) {
      setPwdMsg({ type: "error", text: t("auth.passwordMismatch") });
      return;
    }
    pwdMut.mutate();
  }

  return (
    <div className="space-y-6 max-w-md animate-fade-in">
      <h1 className="text-xl font-semibold text-purple-200">
        {t("nav.settings")}
      </h1>

      {/* Profile */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">
          {t("settings.profile")}
        </h2>
        <Input
          label={t("staff.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={t("staff.phone")}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>
            {t("common.save")}
          </Button>
          {saved && (
            <span className="text-sm text-green-400">
              {t("common.success")}
            </span>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">
          {t("settings.changePassword")}
        </h2>
        <Input
          label={t("settings.currentPassword")}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label={t("settings.newPassword")}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label={t("settings.confirmNewPassword")}
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleChangePassword}
            loading={pwdMut.isPending}
            disabled={!currentPassword || !newPassword || !confirmNewPassword}
          >
            {t("settings.changePassword")}
          </Button>
          {pwdMsg && (
            <span className={`text-sm ${pwdMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
              {pwdMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">
          {t("settings.theme")}
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {dark ? t("settings.darkTheme") : t("settings.lightTheme")}
          </span>
          <button
            onClick={toggle}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
              dark
                ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${
                dark ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
