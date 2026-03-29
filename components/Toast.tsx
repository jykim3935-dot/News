"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      const id = nextId++;
      setMessages((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
        {messages.map((msg) => (
          <ToastItem key={msg.id} msg={msg} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  msg,
  onDismiss,
}: {
  msg: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(msg.id), 4000);
    return () => clearTimeout(timer);
  }, [msg.id, onDismiss]);

  const bgColor =
    msg.type === "success"
      ? "bg-green-600"
      : msg.type === "error"
        ? "bg-red-600"
        : "bg-blue-600";

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm animate-[slideIn_0.2s_ease-out] cursor-pointer`}
      onClick={() => onDismiss(msg.id)}
    >
      {msg.message}
    </div>
  );
}
