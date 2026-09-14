import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      type = "button",
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-700 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] motion-reduce:transform-none";

    const variantStyles = {
      primary:
        "bg-amber-800 text-white hover:bg-amber-900 border border-transparent shadow-xs",
      secondary:
        "bg-stone-800 text-stone-100 hover:bg-stone-900 border border-transparent shadow-xs",
      outline:
        "bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 hover:border-stone-400 shadow-2xs",
      ghost:
        "bg-transparent text-stone-700 hover:bg-stone-200/60 hover:text-stone-900",
      destructive:
        "bg-red-700 text-white hover:bg-red-800 border border-transparent shadow-xs",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-md gap-1.5",
      md: "h-9.5 px-4 text-xs sm:text-sm rounded-lg gap-2",
      lg: "h-11 px-5 text-sm sm:text-base rounded-xl gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current motion-reduce:animate-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
