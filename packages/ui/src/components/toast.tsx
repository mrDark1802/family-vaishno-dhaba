"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface ToastItem {
  id: string;
  type?: "success" | "error" | "info" | "warning" | "neutral";
  title?: string;
  message?: string;
  description?: string;
}

export interface ToastContextType {
  toast: (item: Omit<ToastItem, "id">) => void;
  addToast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    ({ type = "info", title, message, description }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [
        ...prev,
        { id, type, title, message: message || description || "" },
      ]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const typeStyles = {
    success: "bg-emerald-50 text-emerald-900 border-emerald-300",
    error: "bg-red-50 text-red-900 border-red-300",
    warning: "bg-amber-50 text-amber-900 border-amber-300",
    info: "bg-stone-900 text-white border-stone-800",
    neutral: "bg-stone-100 text-stone-900 border-stone-300",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, addToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg text-xs font-medium flex items-start justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 ${
              typeStyles[t.type || "info"]
            }`}
          >
            <div>
              {t.title && (
                <span className="font-bold block text-sm mb-0.5">
                  {t.title}
                </span>
              )}
              {t.message && <p className="leading-snug">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-current opacity-60 hover:opacity-100 font-bold px-1"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
