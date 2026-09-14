import React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, required, className = "", ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-xs font-semibold text-stone-700 select-none ${className}`}
        {...props}
      >
        {children}
        {required && (
          <span className="text-amber-800 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  },
);

Label.displayName = "Label";
