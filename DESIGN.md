# Questify Design System
> Inspired by Linear — dark-mode-native, precision engineering, indigo accent.  
> Adapted for a gamified task tracker: achievement moments get warmth, errors get clarity, density scales with context.

## 1. Atmosphere & Identity

Questify feels like a **quiet command center for personal growth**. The interface recedes — dark surfaces let content breathe, gamification moments (XP, achievements) provide the only chromatic warmth. The signature is **luminance hierarchy**: depth through tonal shifts, not borders. Every pixel is intentional; no decoration survives that doesn't earn its place.

Dark-mode-native. Light mode is a secondary, respectful variant — never the primary design target.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--surface-primary` | `#f7f8f8` | `#08090a` | Main background |
| Surface/secondary | `--surface-secondary` | `#ffffff` | `#0f1011` | Cards, panels, sidebar |
| Surface/elevated | `--surface-elevated` | `#ffffff` | `#191a1b` | Modals, dropdowns |
| Text/primary | `--text-primary` | `#0f1011` | `#f7f8f8` | Headlines, body |
| Text/secondary | `--text-secondary` | `#5e6068` | `#d0d6e0` | Descriptions, hints |
| Text/tertiary | `--text-tertiary` | `#8a8f98` | `#8a8f98` | Metadata, placeholders |
| Border/default | `--border-default` | `#d0d6e0` | `#23252a` | Divider lines, card borders |
| Border/subtle | `--border-subtle` | `#e6e6e6` | `rgba(255,255,255,0.05)` | Soft separations |
| Accent/primary | `--accent-primary` | `#5e6ad2` | `#5e6ad2` | CTAs, brand elements |
| Accent/interactive | `--accent-interactive` | `#7170ff` | `#7170ff` | Links, active states |
| Accent/hover | `--accent-hover` | `#828fff` | `#828fff` | Hover on accent |
| Status/success | `--status-success` | `#27a644` | `#10b981` | Completed tasks, XP gains |
| Status/warning | `--status-warning` | `#d97706` | `#f59e0b` | Streaks, amber moments |
| Status/error | `--status-error` | `#dc2626` | `#ef4444` | Destructive actions |
| Gamification/xp | `--xp-amber` | `#d97706` | `#f59e0b` | XP bar, level badge |
| Gamification/gold | `--xp-gold` | `#b45309` | `#fbbf24` | Achievement highlights |

### Rules
- Accent (indigo-violet) used ONLY for interactive elements. Never decorative.
- XP/achievement colors are the exception — they're the only warm chromatic accents, signaling progress.
- Never introduce a hex code not in this table. Extend the table first.
- Dark mode is default. Light mode values are secondary but must be complete.

## 3. Typography

### Font Stack
- **Primary**: `Inter Variable, SF Pro Display, -apple-system, system-ui, sans-serif`
- **Mono**: `JetBrains Mono, ui-monospace, SF Mono, monospace`

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 32px / 2rem | 590 | 1.15 | -0.02em | Page titles (Dashboard, Tasks) |
| H1 | 24px / 1.5rem | 590 | 1.2 | -0.01em | Section headers |
| H2 | 18px / 1.125rem | 510 | 1.3 | 0 | Card titles |
| H3 | 16px / 1rem | 510 | 1.4 | 0 | Subsection labels |
| Body | 15px / 0.9375rem | 400 | 1.5 | 0 | Default text, task descriptions |
| Body/sm | 13px / 0.8125rem | 400 | 1.4 | 0 | Secondary info, tags |
| Caption | 11px / 0.6875rem | 510 | 1.3 | 0.02em | Badges, labels, metadata |
| Overline | 10px / 0.625rem | 590 | 1.2 | 0.08em | Uppercase section labels |

### Rules
- Max 2 font families: Inter + JetBrains Mono.
- Weight 510 is the signature — use it for UI labels and card titles. Not 500, not 600 — exactly 510 when available.
- Body text never bold. Emphasis via weight 510, not 700.
- Tracking is negative at display sizes, zero elsewhere. Overline is the exception.

## 4. Spacing

### Scale
`4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64`

### Rules
- Page padding: `16px` on mobile, `24px` on desktop (`px-4 sm:px-6`)
- Card internal padding: `16px` (`p-4`)
- Section gap: `24px` (`space-y-6` / `gap-6`)
- Component gap: `12px` (`space-y-3` / `gap-3`)
- Dense lists: `8px` (`space-y-2` / `gap-2`)
- Never mix arbitrary spacing values. Pick from the scale.

## 5. Components

### Cards
- Background: `--surface-secondary`
- Border: `1px solid --border-subtle` (dark) or `--border-default` (light)
- Radius: `8px` (comfortably rounded, not pill-like)
- Shadow: none by default. On hover: subtle ring `0 0 0 1px --accent-primary/20`
- Selected state: ring `0 0 0 2px --accent-interactive/50`

### Buttons
- **Primary (CTA)**: Background `--accent-primary`, text `#ffffff`, radius `8px`, padding `8px 16px`
- **Secondary**: Background transparent, ring `0 0 0 1px --border-default`, text `--text-primary`
- **Ghost**: Background transparent, text `--text-secondary`, hover: bg `--surface-secondary`
- **Destructive**: Background `--status-error`, text `#ffffff`
- **Icon-only**: Size `32px` (default), `28px` (compact), `24px` (xs)

### Inputs
- Background: `--surface-secondary`
- Border: `1px solid --border-default`
- Focus ring: `0 0 0 2px --accent-primary/30`
- Radius: `8px`
- Padding: `8px 12px`

### Navigation (Mobile Bottom Bar)
- Height: `56px` (`h-14`)
- Background: `--surface-secondary` with `backdrop-blur`
- Border: `1px solid --border-subtle` (top only)
- Icons: `20px` (`size-5`)
- Labels: Caption size, weight 510

### XP Progress Bar
- Track: `--border-default`, height `12px`, radius full
- Fill: gradient amber `--xp-amber` → `--xp-gold`, animated on mount
- Level badge: gradient circle, amber-gold, size `48px` / `40px`

### Achievement Cards
- Unlocked: amber border `--xp-gold/30`, subtle amber glow shadow
- Locked: opacity 50%, grayscale filter
- Size: `min-w-[130px]`, horizontal scroll container

### Badges
- Priority P1: destructive variant (red)
- Priority P2: default (indigo)
- Priority P3: secondary (gray)
- Priority P4: outline
- Status: dot indicator + label, 11px

## 6. Layout

### Breakpoints
- Mobile: <768px (stacked, bottom nav)
- Desktop: ≥1024px (sidebar + content)

### Desktop Layout
```
┌──────────┬──────────────────────────┐
│ Sidebar  │ Content (flex-1)         │
│ 256px    │ max-w-4xl, centered      │
│ (56px    │                          │
│  collaps)│                          │
└──────────┴──────────────────────────┘
```

### Mobile Layout
```
┌──────────────────────────┐
│ Content (full width)     │
│ px-4, pb-16 for bottom   │
│ nav clearance             │
├──────────────────────────┤
│ Bottom Nav (fixed, h-14)  │
│ safe-area-inset-bottom    │
└──────────────────────────┘
```

### Container
- Content pages: `max-w-4xl mx-auto` (896px)
- Narrow pages (forms): `max-w-lg mx-auto` (512px)
- Dashboard: `max-w-4xl mx-auto`
- Tasks split-view: `max-w-7xl` (desktop), `max-w-4xl` (mobile)

### Rules
- Every page has `min-h-screen` on the root flex container.
- Content area has `pb-16` on mobile for bottom nav clearance.
- Sidebar hides below `lg:` breakpoint.
- No horizontal scroll. Ever. `min-w-0` on flex children.

## 7. Do's and Don'ts

### Do
- Use `--text-primary` for all body text. Never pure white or pure black.
- Use `--border-subtle` for card borders in dark mode — ultra-thin, barely visible.
- Use weight 510 for UI labels — it's the signature weight.
- Use amber/gold ONLY for gamification moments (XP, achievements, streaks).
- Keep cards border-radius at 8px — consistent, not pill-like.
- Use `min-w-0` on flex children to prevent overflow.
- Verify at 375px, 768px, 1280px before committing.
- Use GPU-composited animations only: `transform`, `opacity`, `filter`.

### Don't
- Don't use shadows for depth — use tonal surface shifts (`--surface-primary` → `--surface-secondary`).
- Don't introduce colors outside the palette table.
- Don't use bold (700) for body text — weight 510 for emphasis.
- Don't use `container` class — use `max-w-*` with `mx-auto`.
- Don't use `overflow-y-auto` inside SortableContext containers (breaks @dnd-kit).
- Don't use Framer Motion `motion.div` wrappers inside DnD contexts (transform conflict).
- Don't hardcode hex codes. Reference CSS variables.
- Don't skip dark mode. Every component must work in both modes.
