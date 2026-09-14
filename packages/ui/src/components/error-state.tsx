import React from "react";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description = "We encountered an unexpected error. Please try again.",
  onRetry,
  className = "",
}) => {
  return (
    <div
      role="alert"
      className={`text-center py-12 px-6 rounded-2xl bg-stone-50 border border-stone-200/80 max-w-lg mx-auto space-y-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto text-xl font-bold">
        ⚠
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-stone-900">{title}</h3>
        <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button onClick={onRetry} size="sm" variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};
