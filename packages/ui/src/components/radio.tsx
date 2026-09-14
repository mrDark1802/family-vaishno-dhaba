import React from "react";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  className = "",
}) => {
  return (
    <fieldset className={`space-y-2.5 ${className}`}>
      {label && (
        <legend className="text-xs font-semibold text-stone-700 mb-1">
          {label}
        </legend>
      )}
      <div className="space-y-2">
        {options.map((opt) => {
          const id = `${name}-${opt.value}`;
          const isSelected = value === opt.value;

          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors duration-150 ${
                isSelected
                  ? "border-amber-800 bg-amber-50/40 text-stone-900"
                  : "border-stone-200 hover:bg-stone-50 text-stone-700"
              } ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                id={id}
                name={name}
                value={opt.value}
                checked={isSelected}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 w-4 h-4 text-amber-800 border-stone-300 focus:ring-amber-700"
              />
              <div className="flex-1 min-w-0">
                <span className="font-semibold block">{opt.label}</span>
                {opt.description && (
                  <p className="text-stone-500 mt-0.5">{opt.description}</p>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-red-700 font-medium mt-1">{error}</p>
      )}
    </fieldset>
  );
};
