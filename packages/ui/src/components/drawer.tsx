"use client";

import React, { useEffect, useRef } from "react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: "right" | "left";
  maxWidth?: "sm" | "md" | "lg";
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = "right",
  maxWidth = "md",
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      drawerRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-2xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 ${position === "right" ? "right-0" : "left-0"} max-w-full flex`}
      >
        <div
          ref={drawerRef}
          tabIndex={-1}
          className={`w-screen ${widthStyles[maxWidth]} bg-white shadow-2xl border-stone-200 flex flex-col focus:outline-none ${
            position === "right" ? "border-l" : "border-r"
          }`}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/80">
              <div>
                <h2 className="text-base font-bold text-stone-900">{title}</h2>
                {description && (
                  <p className="text-xs text-stone-500 mt-0.5">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition"
                aria-label="Close drawer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {footer && (
            <div className="p-6 border-t border-stone-100 bg-stone-50/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
