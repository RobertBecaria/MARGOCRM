import { Calendar, CheckSquare, CreditCard, Users, Settings } from "lucide-react";

interface ActionCardProps {
  actions: Record<string, unknown>[];
}

const actionIcons: Record<string, typeof Calendar> = {
  schedule: Calendar,
  task: CheckSquare,
  payroll: CreditCard,
  user: Users,
  default: Settings,
};

export default function ActionCard({ actions }: ActionCardProps) {
  return (
    <div className="space-y-2">
      {actions.map((action, idx) => {
        const type = String(action.type || action.action || "default");
        const Icon = actionIcons[type] || actionIcons.default;
        const description = String(action.description || action.message || JSON.stringify(action));

        return (
          <div
            key={idx}
            className="flex items-start gap-2 p-2.5 rounded-lg border border-green-500/20 bg-green-500/10"
          >
            <div className="p-1 rounded bg-green-500/15 text-green-400 shrink-0 mt-0.5">
              <Icon size={14} />
            </div>
            <div className="text-xs text-green-300">
              {description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
