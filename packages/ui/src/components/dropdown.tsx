"use client";

import React, { useState, useRef, useEffect } from "react";

export interface DropdownItem {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = "right",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
    >
      <div onClick={() => setIsOpen(!isOpen)} role="button" tabIndex={0}>
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 w-48 rounded-xl bg-white shadow-lg border border-stone-200 py-1 z-30 focus:outline-none animate-in fade-in zoom-in-95 duration-100`}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick?.();
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-xs font-medium transition duration-150 flex items-center justify-between ${
                item.destructive
                  ? "text-red-700 hover:bg-red-50"
                  : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
              } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
