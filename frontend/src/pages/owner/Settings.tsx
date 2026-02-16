import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useThemeStore } from "../../store/themeStore";
import { updateUser } from "../../api/users";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function Settings() {
  const { t } = useTranslation();
  const { user, loadUser } = useAuth();
  const { dark, toggle } = useThemeStore();

  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saved, setSaved] = useState(false);

  const saveMut = useMutation({
    mutationFn: () =>
      updateUser(user!.id, { full_name: name, phone: phone || null }),
    onSuccess: async () => {
      await loadUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("nav.settings")}
      </h1>

      {/* Profile */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Профиль
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
            <span className="text-sm text-green-600 dark:text-green-400">
              {t("common.success")}
            </span>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Тема
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {dark ? "Тёмная тема" : "Светлая тема"}
          </span>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              dark ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                dark ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
