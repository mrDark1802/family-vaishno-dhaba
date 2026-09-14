import React from "react";
import { Label } from "./label";
import { FormMessage } from "./form-message";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      children,
      error,
      helperText,
      id,
      required,
      className = "",
      ...props
    },
    ref,
  ) => {
    const selectId =
      id ||
      (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={selectId} required={required}>
            {label}
          </Label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error || helperText ? `${selectId}-desc` : undefined
            }
            className={`w-full appearance-none px-3.5 py-2 pr-9 text-sm bg-white border rounded-lg text-stone-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed ${
              error
                ? "border-red-500 focus:ring-red-600 focus:border-red-600"
                : "border-stone-300 hover:border-stone-400"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-stone-500">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <FormMessage
          id={selectId ? `${selectId}-desc` : undefined}
          error={error}
          helperText={helperText}
        />
      </div>
    );
  },
);

Select.displayName = "Select";
