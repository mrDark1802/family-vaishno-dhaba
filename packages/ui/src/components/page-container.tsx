import React from "react";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "full";
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  size = "lg",
  className = "",
  ...props
}) => {
  const sizeStyles = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
