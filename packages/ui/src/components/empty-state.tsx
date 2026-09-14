import React from "react";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionLabel,
  onAction,
  className = "",
}) => {
  const label = actionLabel || actionText;

  return (
    <div
      className={`text-center py-12 px-4 rounded-xl bg-stone-50 border border-dashed border-stone-300 ${className}`}
    >
      {icon && (
        <div className="mx-auto flex items-center justify-center h-14 w-14 text-stone-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-stone-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-stone-500 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {label && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} size="md" variant="primary">
            {label}
          </Button>
        </div>
      )}
    </div>
  );
};
