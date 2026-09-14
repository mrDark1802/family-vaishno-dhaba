import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "outlined" | "elevated";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "default", className = "", ...props }, ref) => {
    const variantStyles = {
      default: "bg-white border border-stone-200/90 shadow-2xs",
      interactive:
        "bg-white border border-stone-200/90 shadow-2xs hover:border-amber-800/40 hover:shadow-xs cursor-pointer transition-all duration-150",
      outlined: "bg-transparent border border-stone-300",
      elevated: "bg-white border border-stone-200 shadow-sm",
    };

    return (
      <div
        ref={ref}
        className={`rounded-xl overflow-hidden ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
