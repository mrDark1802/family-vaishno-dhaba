import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "neutral"
    | "primary"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "veg"
    | "blue"
    | "orange"
    | "purple"
    | "cyan";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  className = "",
  ...props
}) => {
  const variantStyles = {
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    primary: "bg-amber-100 text-amber-900 border-amber-300",
    success: "bg-emerald-100 text-emerald-900 border-emerald-300",
    warning: "bg-amber-100 text-amber-900 border-amber-300",
    error: "bg-red-100 text-red-900 border-red-300",
    info: "bg-sky-100 text-sky-900 border-sky-300",
    blue: "bg-blue-100 text-blue-900 border-blue-300",
    orange: "bg-orange-100 text-orange-950 border-orange-300",
    purple: "bg-purple-100 text-purple-900 border-purple-300",
    cyan: "bg-cyan-100 text-cyan-900 border-cyan-300",
    veg: "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold",
  };

  const sizeStyles = {
    sm: "px-2 py-0.2 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border leading-tight select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {variant === "veg" && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-700"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
