import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import ActionCard from "./ActionCard";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actions?: Record<string, unknown>[];
}

export default function ChatMessage({ role, content, timestamp, actions }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-1.5`}>
        <div
          className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
            isUser
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm"
          }`}
        >
          {content}
        </div>

        {actions && actions.length > 0 && <ActionCard actions={actions} />}

        <div className={`text-[10px] text-gray-400 dark:text-gray-500 ${isUser ? "text-right" : "text-left"}`}>
          {(() => {
            try {
              return format(parseISO(timestamp), "HH:mm", { locale: ru });
            } catch {
              return "";
            }
          })()}
        </div>
      </div>
    </div>
  );
}
