import React from "react";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, id, className = "", ...props }, ref) => {
    const inputId =
      id ||
      (typeof label === "string"
        ? label.toLowerCase().replace(/[^a-z0-9]/g, "-")
        : undefined);

    return (
      <div className={`flex items-start gap-2.5 ${className}`}>
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="w-4 h-4 rounded border-stone-300 text-amber-800 focus:ring-amber-700 focus:ring-offset-1 transition duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-xs">
            {label && (
              <label
                htmlFor={inputId}
                className="font-medium text-stone-800 cursor-pointer select-none"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-stone-500 mt-0.5">{description}</p>
            )}
            {error && (
              <p className="text-red-700 font-medium mt-0.5">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
