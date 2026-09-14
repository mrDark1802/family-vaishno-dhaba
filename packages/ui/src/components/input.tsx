import React from "react";
import { Label } from "./label";
import { FormMessage } from "./form-message";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, id, required, className = "", ...props },
    ref,
  ) => {
    const inputId =
      id ||
      (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error || helperText ? `${inputId}-desc` : undefined}
          className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-stone-900 placeholder:text-stone-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed ${
            error
              ? "border-red-500 focus:ring-red-600 focus:border-red-600"
              : "border-stone-300 hover:border-stone-400"
          } ${className}`}
          {...props}
        />
        <FormMessage
          id={inputId ? `${inputId}-desc` : undefined}
          error={error}
          helperText={helperText}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
