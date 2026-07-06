# Questify Design System
> Extracted from the current shadcn/ui + Geist Sans codebase.  
> Documents what IS, not what should be. Expert review will propose improvements.

## 1. Atmosphere & Identity

Questify is a **gamified task tracker** with a utilitarian, readable interface. The design is driven by shadcn/ui defaults — neutral grays, clean typography, minimal decoration. The dark mode adds depth through subtle surface layering. Gamification elements (XP bar, streaks, achievements) introduce the only chromatic warmth via amber/orange accents. The interface values information density over visual flair.

## 2. Color

### Palette (extracted from globals.css)

| Role | Token | Light (oklch) | Dark (oklch) | Hex approx | Usage |
|------|-------|---------------|--------------|------------|-------|
| Background | `--background` | `1 0 0` | `0.145 0 0` | `#fff` / `#1a1a1a` | Page background |
| Foreground | `--foreground` | `0.145 0 0` | `0.985 0 0` | `#1a1a1a` / `#fafafa` | Primary text |
| Card | `--card` | `1 0 0` | `0.205 0 0` | `#fff` / `#2a2a2a` | Card, panel, sidebar |
| Card fg | `--card-foreground` | `0.145 0 0` | `0.985 0 0` | `#1a1a1a` / `#fafafa` | Text on cards |
| Primary | `--primary` | `0.205 0 0` | `0.922 0 0` | `#1a1a1a` / `#e5e5e5` | Primary button bg |
| Primary fg | `--primary-foreground` | `0.985 0 0` | `0.205 0 0` | `#fafafa` / `#1a1a1a` | Text on primary |
| Secondary | `--secondary` | `0.97 0 0` | `0.269 0 0` | `#f5f5f5` / `#3a3a3a` | Secondary bg |
| Muted | `--muted` | `0.97 0 0` | `0.269 0 0` | `#f5f5f5` / `#3a3a3a` | Muted bg (tags) |
| Muted fg | `--muted-foreground` | `0.556 0 0` | `0.708 0 0` | `#737373` / `#a3a3a3` | Secondary text |
| Border | `--border` | `0.922 0 0` | `1 0 0 / 10%` | `#e5e5e5` / `rgba(255,255,255,0.1)` | Dividers |
| Destructive | `--destructive` | `0.577 0.245 27.325` | `0.704 0.191 22.216` | `#ef4444` / `#f87171` | Delete, errors |
| Ring | `--ring` | `0.708 0 0` | `0.556 0 0` | `#a3a3a3` / `#737373` | Focus ring |
| Sidebar bg | `--sidebar` | `0.985 0 0` | `0.205 0 0` | — | Sidebar surface |
| Sidebar fg | `--sidebar-foreground` | `0.145 0 0` | `0.985 0 0` | — | Sidebar text |
| Sidebar accent | `--sidebar-primary` | `0.205 0 0` | `0.488 0.243 264.376` | — | Active nav (indigo in dark) |

### Staging accents (NEXT_PUBLIC_APP_ENV=staging)
- Banner: amber `bg-amber-500/90`
- Heart: yellow-amber gradient (`#fde047` → `#eab308`)

### Production accents
- Heart: red gradient (`#ef4444` → `#dc2626`)

### Radius
- Base: `0.625rem` (10px)

## 3. Typography

### Font Stack
- **Primary**: `Geist Sans, var(--font-sans), system-ui, sans-serif`
- **Mono**: `Geist Mono, var(--font-geist-mono), monospace`
- **Heading**: inherits `--font-sans` (same as body)

### Scale (from Tailwind defaults)

| Level | Tailwind | Size | Usage |
|-------|----------|------|-------|
| Page title | `text-2xl` | 24px / 1.5rem | Dashboard, Tasks, Matrix headers |
| Card title | `text-base` | 16px / 1rem | TaskCard title, plan names |
| Body | `text-sm` | 14px / 0.875rem | Descriptions, task lists |
| Caption | `text-xs` | 12px / 0.75rem | Due dates, secondary info |
| Micro | `text-[10px]` | 10px | Tags, mobile nav labels |
| Badge | `text-[10px]` | 10px | Priority/status badges |
| Lead | `text-lg` | 18px | Stat numbers, streak counter |

## 4. Spacing

### Scale (Tailwind defaults)
`1 (4px), 1.5 (6px), 2 (8px), 3 (12px), 4 (16px), 6 (24px), 8 (32px)`

### Patterns
- Card padding: `p-4` (16px) or `py-4` for compact
- Card gap: `space-y-3` (12px) or `gap-3`
- Page padding: `p-6` (24px) → `px-4` on mobile
- Section gap: `space-y-6` (24px)
- Badge gap: `gap-1.5` (6px)

## 5. Components

### Cards (shadcn/ui Card)
- Background: `bg-card`, border: `border border-border`
- Hover: `hover:shadow-md` transition
- Selected: `ring-2 ring-primary/50`
- Done state: `opacity-70`, title `line-through`
- Radius: `rounded-xl` (12px)

### Buttons (shadcn/ui Button)
- Variants: default, secondary, outline, ghost, destructive
- Sizes: default, sm, lg, icon, icon-sm, icon-xs
- Icon-xs: 24px, Icon-sm: 28px, Icon: 32px

### Badges (shadcn/ui Badge)
- Variants: default, secondary, destructive, outline
- Priority P1 → destructive, P2 → default, P3 → secondary, P4 → outline
- Status: todo → secondary, in_progress → default, done → outline

### Mobile Bottom Nav
- Height: `h-14` (56px)
- Icons: `size-5` (20px)
- Labels: `text-[10px]`
- Position: `fixed bottom-0`, `safe-bottom`

### XP Progress Bar
- Background: `bg-muted`, height: `h-3` (12px)
- Fill: amber gradient (`from-amber-400 to-orange-500`)

### Kanban Cards
- Background: `bg-card/60`, border: `border-border`
- Drag: `cursor-grab`, active: `cursor-grabbing`
- Width: `w-[300px]` (column), `flex-1 min-w-0` (responsive)

## 6. Layout

### Breakpoints (Tailwind defaults)
- Mobile: <640px (sm)
- Tablet: 640-1023px (md)
- Desktop: ≥1024px (lg)

### Structure
```
┌──────────┬──────────────────────────┐
│ Sidebar  │ <main> flex-1 min-w-0     │
│ lg:flex  │ px-4 sm:px-6              │
│ 256px    │ pb-16 (mobile nav space)  │
└──────────┴──────────────────────────┘
```

### Containers
- Wide pages: `max-w-4xl mx-auto`
- Narrow pages: `max-w-lg mx-auto` / `max-w-3xl`
- Full-width: `w-full` (dashboard, matrix)

## 7. Do's and Don'ts

### Do
- Use Tailwind utility classes (no raw CSS unless unavoidable)
- Use `min-w-0` on flex children to prevent overflow
- Use `pb-16` on mobile for bottom nav clearance
- Use `cn()` utility for conditional classes
- GPU-composited animations only: `transform`, `opacity`

### Don't
- Don't use `container` class — prefer `max-w-* mx-auto`
- Don't use `overflow-y-auto` inside SortableContext (breaks @dnd-kit)
- Don't use `motion.div` wrappers inside DnD contexts (transform conflict)
- Don't hardcode hex codes — use Tailwind classes or CSS variables
- Don't skip dark mode — every component must work in both modes
- Don't hide actions behind hover-only on mobile (use `opacity-100 lg:opacity-0 lg:group-hover:opacity-100`)
