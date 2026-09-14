"use client";

import React from "react";

export interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  size = "md",
}) => {
  const sizeStyles = {
    sm: "h-7 px-2 text-xs",
    md: "h-9 px-3 text-sm",
    lg: "h-11 px-4 text-base",
  };

  const btnSize = {
    sm: "w-6 h-6 text-xs",
    md: "w-7 h-7 text-sm",
    lg: "w-8 h-8 text-base",
  };

  return (
    <div
      className={`inline-flex items-center justify-between bg-stone-100 rounded-lg border border-stone-200 ${sizeStyles[size]}`}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= min}
        className={`flex items-center justify-center rounded-md font-bold text-stone-700 hover:bg-stone-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition ${btnSize[size]}`}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="font-semibold text-stone-900 px-3 text-center select-none">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= max}
        className={`flex items-center justify-center rounded-md font-bold text-stone-700 hover:bg-stone-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition ${btnSize[size]}`}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
};
