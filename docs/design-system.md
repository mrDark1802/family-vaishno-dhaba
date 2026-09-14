# Family Vaishno Dhaba — Design System Documentation

## 1. Visual Design Philosophy & Anti-AI Aesthetic Principles

Family Vaishno Dhaba represents authentic Punjabi & Himachali pure-vegetarian culinary heritage. The design system is deliberately engineered to feel **human, grounded, warm, and authentic**, avoiding the generic, AI-generated SaaS website look.

### Core Guidelines:

- **No Generic AI Aesthetics**: Avoid purple/blue gradients, glowing neon borders, excessive floating cards, exaggerated drop shadows, and arbitrary pill shapes everywhere.
- **Warm, Light-First Canvas**: 80–90% neutral warm canvas (`#FAF8F5` subtle ivory/off-white) paired with high-contrast charcoal text (`#1C1917`).
- **Restrained Accents (10–20%)**: Rich terracotta saffron (`#B43403`) for primary actions and brand emphasis; Satvik green (`#15803D`) for pure vegetarian emblems and success confirmations.
- **Tactile & Honest Hierarchy**: Clean 1px solid borders (`#E5DFD7`), soft 2xs/xs shadows, tactile active press states (`active:scale-[0.98]`), and visible focus rings.

---

## 2. Design Tokens & Color Architecture

All tokens are defined in `packages/ui/src/tokens.ts` and exposed as CSS variables in `globals.css`.

### Semantic Color Tokens

| Token Name         | Hex Value | Semantic Purpose                                   |
| :----------------- | :-------- | :------------------------------------------------- |
| `bg`               | `#FAF8F5` | Default customer app canvas (warm ivory off-white) |
| `bg-muted`         | `#F5F2EC` | Secondary card background, subtle section fills    |
| `bg-subtle`        | `#EFECE6` | Active/hover backdrops, disabled background fills  |
| `surface`          | `#FFFFFF` | Primary card, modal, and drawer elevated surface   |
| `surface-elevated` | `#FFFFFF` | Floating popovers and dropdown menus               |
| `text`             | `#1C1917` | Primary high-contrast body and heading text        |
| `text-muted`       | `#57534E` | Secondary body text, instructions, and labels      |
| `text-subtle`      | `#A8A29E` | Timestamps, metadata, and placeholder text         |
| `primary`          | `#B43403` | Terracotta saffron (buttons, key highlights)       |
| `primary-hover`    | `#9A2C02` | Darkened terracotta hover state                    |
| `primary-active`   | `#7C2402` | Active press state                                 |
| `primary-muted`    | `#FDF4EC` | Saffron tinted alert badges and highlights         |
| `border`           | `#E5DFD7` | Standard 1px container and table divider border    |
| `border-subtle`    | `#F0ECE5` | Subtle internal card divider                       |
| `veg`              | `#15803D` | Satvik Pure Vegetarian green emblem & badge        |
| `veg-bg`           | `#F0FDF4` | Satvik green badge background                      |
| `warning`          | `#D97706` | Warning alerts and low stock statuses              |
| `error`            | `#DC2626` | Destructive actions, validation error states       |
| `info`             | `#0284C7` | Information alerts and hints                       |

---

## 3. Border Radius & Spacing Scales

### Radius Scale (`tokens.radius`)

- `sm` (`6px` / `0.375rem`): Badges, tooltips, small buttons, status indicators.
- `md` (`10px` / `0.625rem`): Standard buttons, input fields, selects, dropdowns.
- `lg` (`16px` / `1.0rem`): Cards, modal dialogs, drawers, callout containers.
- `pill` (`9999px`): Circular avatar counters, pill badges, floating cart count.

### Spacing & Grid System

- Standard 4px baseline grid (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-6` = 24px, `p-8` = 32px).
- Maximum content width: `max-w-7xl` (1280px) with responsive horizontal padding (`px-4 sm:px-6 lg:px-8`).

---

## 4. Typography Scale & Hierarchy

| Element   | Class / Weight   | Size / Line Height                                   | Role                            |
| :-------- | :--------------- | :--------------------------------------------------- | :------------------------------ |
| `h1`      | `font-extrabold` | `text-2xl sm:text-3xl lg:text-4xl` (`leading-tight`) | Page Hero & Major Page Headers  |
| `h2`      | `font-bold`      | `text-lg sm:text-xl` (`leading-snug`)                | Section Headings & Panel Titles |
| `h3`      | `font-bold`      | `text-sm sm:text-base`                               | Dish Names & Card Titles        |
| `body`    | `font-normal`    | `text-xs sm:text-sm` (`leading-relaxed`)             | Descriptions & Explanatory Text |
| `caption` | `font-semibold`  | `text-[11px] / text-[10px]`                          | Badges, Timestamps, Metadata    |

---

## 5. Motion & Transitions

- **Standard Timing**: Fast (`150ms`), Normal (`200ms`), Slow (`300ms`).
- **Standard Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out deceleration).
- **Reduced Motion**: All CSS transitions and animations respect `@media (prefers-reduced-motion: reduce)`.

---

## 6. Reusable Component Primitives (`@repo/ui`)

All primitives are implemented in `@repo/ui` with strict TypeScript types and zero external UI bloat.

### Component Index:

1. **`Button`**:
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `destructive`
   - Sizes: `sm`, `md`, `lg`
   - States: `isLoading` (renders spinner), `disabled`, `fullWidth`
2. **`Input` & `Textarea`**:
   - Supports `label`, `helperText`, `error`, disabled state, and full ARIA props (`aria-invalid`, `aria-describedby`).
3. **`Select`**:
   - Accessible styled native select with custom chevron indicator.
4. **`Checkbox` & `RadioGroup`**:
   - Accessible custom checkbox and radio options with label and optional description.
5. **`Switch`**:
   - Accessible toggle switch with smooth translation transitions.
6. **`Card`**:
   - Variants: `default`, `interactive` (hover transform), `outlined`, `elevated`.
7. **`Badge`**:
   - Variants: `neutral`, `primary`, `success`, `warning`, `error`, `info`, `veg`.
8. **`Dialog`**:
   - Accessible modal dialog with backdrop, escape key handler, focus trap, and portal support.
9. **`Drawer`**:
   - Slide-over overlay with `position="left" | "right"`, header, scrollable body, and fixed footer.
10. **`Dropdown`**:
    - Accessible popover menu with click-outside detection and keyboard escape listener.
11. **`ToastProvider` & `useToast`**:
    - Centralized toast dispatcher supporting `success`, `error`, `warning`, `info`, `neutral` types with auto-dismiss timers.
12. **`Skeleton`**:
    - Standard pulsing placeholder for asynchronous content.
13. **`EmptyState` & `ErrorState`**:
    - Standardized empty and failure recovery screens with CTA actions.

---

## 7. Accessibility (A11y) Verification

- **Color Contrast**: All text on background combinations meet WCAG AA contrast ratio (> 4.5:1 for body text, > 3.0:1 for large headings).
- **Focus Rings**: Standardized visible focus ring `focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2`.
- **Screen Reader Support**: ARIA attributes used across all interactive controls (`aria-expanded`, `aria-haspopup`, `aria-invalid`, `role="dialog"`).
