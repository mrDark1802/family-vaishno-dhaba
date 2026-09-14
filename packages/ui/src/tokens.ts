/**
 * Family Vaishno Dhaba Design Tokens & Theme Definitions
 */

export const tokens = {
  colors: {
    background: "var(--color-bg, #FAF8F5)",
    foreground: "var(--color-fg, #1C1917)",
    surface: {
      default: "var(--color-surface, #FFFFFF)",
      muted: "var(--color-surface-muted, #F4F0EA)",
      elevated: "var(--color-surface-elevated, #FFFFFF)",
    },
    border: {
      subtle: "var(--color-border-subtle, #F0EAE1)",
      default: "var(--color-border-default, #E5DFD7)",
      strong: "var(--color-border-strong, #D6CEBF)",
    },
    primary: {
      default: "var(--color-primary, #B43403)", // Warm Indian terracotta
      hover: "var(--color-primary-hover, #9A2C02)",
      active: "var(--color-primary-active, #7C2302)",
      foreground: "var(--color-primary-fg, #FFFFFF)",
    },
    secondary: {
      default: "var(--color-secondary, #292524)", // Charcoal stone
      hover: "var(--color-secondary-hover, #1C1917)",
      foreground: "var(--color-secondary-fg, #FFFFFF)",
    },
    status: {
      success: "var(--color-success, #15803D)", // Satvik Pure Veg Green
      warning: "var(--color-warning, #B45309)", // Warm Amber
      error: "var(--color-error, #B91C1C)", // Restrained Red
      info: "var(--color-info, #0F766E)", // Mountain Pine Teal
    },
    muted: {
      default: "var(--color-muted, #78716C)",
      foreground: "var(--color-muted-fg, #A8A29E)",
    },
  },
  radius: {
    sm: "var(--radius-sm, 6px)",
    md: "var(--radius-md, 10px)",
    lg: "var(--radius-lg, 16px)",
    pill: "var(--radius-pill, 9999px)",
  },
  durations: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
  },
} as const;
