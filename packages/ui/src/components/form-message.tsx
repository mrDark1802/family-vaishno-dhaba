import React from "react";

export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string;
  helperText?: string;
}

export const FormMessage: React.FC<FormMessageProps> = ({
  error,
  helperText,
  className = "",
  ...props
}) => {
  if (error) {
    return (
      <p
        role="alert"
        className={`text-xs font-medium text-red-700 mt-1 flex items-center gap-1 ${className}`}
        {...props}
      >
        <span>⚠</span> {error}
      </p>
    );
  }

  if (helperText) {
    return (
      <p className={`text-xs text-stone-500 mt-1 ${className}`} {...props}>
        {helperText}
      </p>
    );
  }

  return null;
};
