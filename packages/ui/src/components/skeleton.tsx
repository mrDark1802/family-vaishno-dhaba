import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-stone-200/80 rounded-md motion-reduce:animate-none ${className}`}
      {...props}
    />
  );
};
