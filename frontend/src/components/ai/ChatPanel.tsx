import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { useChatStore, type ChatMessage as ChatMsg } from "../../store/chatStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import ChatMessage from "./ChatMessage";

interface ChatPanelProps {
  fullScreen?: boolean;
}

export default function ChatPanel({ fullScreen = false }: ChatPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(fullScreen);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isTyping } = useChatStore();
  const { sendMessage } = useWebSocket();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (fullScreen) {
    return (
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t("ai.title")}
        </h1>
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <MessageArea
            messages={messages}
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            t={t}
          />
          <InputBar
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            t={t}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 lg:bottom-6 right-4 z-40 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Bot size={22} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-40 w-full sm:w-[380px] h-[70vh] sm:h-[500px] sm:bottom-4 sm:right-4 flex flex-col bg-white dark:bg-gray-900 sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("ai.title")}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={16} />
            </button>
          </div>

          <MessageArea
            messages={messages}
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            t={t}
          />
          <InputBar
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            t={t}
          />
        </div>
      )}
    </>
  );
}

function MessageArea({
  messages,
  isTyping,
  messagesEndRef,
  t,
}: {
  messages: ChatMsg[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  t: (k: string) => string;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && (
        <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
          {t("ai.placeholder")}
        </div>
      )}
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          role={msg.role}
          content={msg.content}
          timestamp={msg.timestamp}
          actions={msg.actions}
        />
      ))}
      {isTyping && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          {t("ai.thinking")}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

function InputBar({
  input,
  setInput,
  onSend,
  onKeyDown,
  t,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("ai.placeholder")}
        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onSend}
        disabled={!input.trim()}
        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
