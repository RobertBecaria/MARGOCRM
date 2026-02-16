import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../store/chatStore";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retriesRef = useRef(0);

  const { addMessage, setTyping } = useChatStore();

  const connect = useCallback(() => {
    const tokens = localStorage.getItem("tokens");
    if (!tokens) return;
    const { access_token } = JSON.parse(tokens);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/chat?token=${access_token}`);

    ws.onopen = () => {
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "typing") {
          setTyping(true);
          return;
        }

        if (data.type === "message") {
          setTyping(false);
          addMessage({
            id: data.id || String(Date.now()),
            role: "assistant",
            content: data.content,
            actions: data.actions || undefined,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (data.type === "conversation_id") {
          useChatStore.getState().setConversationId(data.conversation_id);
          return;
        }

        // Fallback: treat as plain message
        setTyping(false);
        addMessage({
          id: String(Date.now()),
          role: "assistant",
          content: typeof data === "string" ? data : data.content || JSON.stringify(data),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Plain text message
        setTyping(false);
        addMessage({
          id: String(Date.now()),
          role: "assistant",
          content: event.data,
          timestamp: new Date().toISOString(),
        });
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [addMessage, setTyping]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    addMessage({
      id: String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    });

    setTyping(true);
    wsRef.current.send(JSON.stringify({ content: text }));
  }, [addMessage, setTyping]);

  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  return { sendMessage, isConnected };
}
