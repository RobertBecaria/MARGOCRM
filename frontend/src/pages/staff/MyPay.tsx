import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { getPayroll } from "../../api/finance";
import { useAuth } from "../../hooks/useAuth";
import { formatMoney } from "../../utils/formatters";
import Badge from "../../components/ui/Badge";
import { Table, Td } from "../../components/ui/Table";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

export default function MyPay() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["my-payroll"],
    queryFn: () => getPayroll({ user_id: user?.id }),
    enabled: !!user,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">
        {t("nav.myPay")}
      </h1>

      {records.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {t("finance.noData")}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table headers={[t("finance.period"), t("finance.baseSalary"), t("finance.bonuses"), t("finance.deductions"), t("finance.total"), t("staff.status"), t("schedule.paidDate")]}>
              {records.map((r) => (
                <tr key={r.id}>
                  <Td className="text-xs">
                    {format(parseISO(r.period_start), "d MMM", { locale: ru })} — {format(parseISO(r.period_end), "d MMM yyyy", { locale: ru })}
                  </Td>
                  <Td>{formatMoney(r.base_salary)}</Td>
                  <Td>{formatMoney(r.bonuses)}</Td>
                  <Td>{formatMoney(r.deductions)}</Td>
                  <Td className="font-medium">{formatMoney(r.net_amount)}</Td>
                  <Td>
                    <Badge color={r.status === "paid" ? "green" : "orange"}>
                      {r.status === "paid" ? t("finance.paid") : t("finance.pendingPayment")}
                    </Badge>
                  </Td>
                  <Td>{r.paid_date ? format(parseISO(r.paid_date), "d MMM yyyy", { locale: ru }) : "—"}</Td>
                </tr>
              ))}
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {records.map((r) => (
              <div
                key={r.id}
                className="glass-card rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {format(parseISO(r.period_start), "d MMM", { locale: ru })} — {format(parseISO(r.period_end), "d MMM", { locale: ru })}
                  </span>
                  <Badge color={r.status === "paid" ? "green" : "orange"}>
                    {r.status === "paid" ? t("finance.paid") : t("finance.pendingPayment")}
                  </Badge>
                </div>
                <div className="text-lg font-bold text-white">
                  {formatMoney(r.net_amount)}
                </div>
                <div className="text-xs text-gray-500 flex gap-3">
                  <span>{t("finance.baseSalary")}: {formatMoney(r.base_salary)}</span>
                  <span>{t("finance.bonuses")}: {formatMoney(r.bonuses)}</span>
                  <span>{t("finance.deductions")}: {formatMoney(r.deductions)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
