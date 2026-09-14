"use client";

import React from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = "",
}) => {
  const switchId =
    id ||
    (typeof label === "string"
      ? label.toLowerCase().replace(/[^a-z0-9]/g, "-")
      : undefined);

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      {(label || description) && (
        <div className="text-xs">
          {label && (
            <label
              htmlFor={switchId}
              className={`font-semibold text-stone-800 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-stone-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-amber-800" : "bg-stone-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};
