# Copycat Web Style Guide

Visual spec for `apps/web`. Minimalistic, modern, light theme, neutral
near-black accent. Implementation: Next.js 16 + Tailwind CSS v4 (CSS-first
tokens) + Motion for React (motion.dev). This document is normative for new UI;
existing screens migrate incrementally.

## 1. Design principles

- Content first. Chrome is quiet: whitespace, hairline borders, no decoration.
- Light theme only. No dark variant, no `prefers-color-scheme` overrides.
- Near-black zinc (`#18181B`) is the accent, never a surface. Target: accent on
  ≤ 5% of pixels.
- Red is semantic only: errors, destructive actions, failed status. Never brand.
- Flat surfaces. One border + at most `shadow-sm`. No gradients, no glass, no glow.
- Modern but calm: Geist type, tabular numbers, short eased transitions.
- One primary action per view. Everything else is secondary or ghost.

## 2. Color

### 2.1 Neutrals (zinc scale)

| Token                   | Value     | Usage                              |
| ----------------------- | --------- | ---------------------------------- |
| `--color-background`    | `#FAFAFA` | App canvas                         |
| `--color-surface`       | `#FFFFFF` | Cards, header, inputs              |
| `--color-border`        | `#E4E4E7` | Hairline borders (zinc-200)        |
| `--color-border-subtle` | `#F4F4F5` | Inner dividers (zinc-100)          |
| `--color-foreground`    | `#18181B` | Headings, primary text (zinc-900)  |
| `--color-muted`         | `#52525B` | Secondary text (zinc-600)          |
| `--color-faint`         | `#A1A1AA` | Metadata, placeholders (zinc-400)  |

### 2.2 Accent (zinc-900)

| Token                | Value     | Usage                                    |
| -------------------- | --------- | ---------------------------------------- |
| `--color-accent-50`  | `#F4F4F5` | Tinted hover rows, selected surfaces     |
| `--color-accent-100` | `#E4E4E7` | Badges, subtle fills                     |
| `--color-accent-200` | `#D4D4D8` | Tinted borders, active card outlines     |
| `--color-accent-600` | `#18181B` | Primary buttons, focus rings, brand mark |
| `--color-accent-700` | `#3F3F46` | Hover / active for the above             |
| `--color-accent-800` | `#18181B` | Accent text on white or tinted surfaces  |

Accent budget — the near-black accent only appears as:
1. Primary button fill (`bg-accent-600`).
2. Link and interactive-text color (`text-accent-800`, hover `accent-700`).
3. Focus ring (`outline-accent-600`).
4. Active nav / tab indicator (2 px accent underline or bar).
5. Small highlights: one word, one icon, one border on hover.

Never: heavy black panels, black headings stacked on dark borders, or accent
used for decoration.

### 2.3 Semantic red (danger only)

Red is reserved for errors, destructive intent, and failure. Use the Tailwind
`red` scale directly; no brand tokens.

| Use                      | Classes                          |
| ------------------------ | -------------------------------- |
| Inline error text        | `text-red-700`                   |
| Error alert surface      | `bg-red-50 text-red-800`         |
| Destructive ghost hover  | `hover:bg-red-50 hover:text-red-700` |
| Failed status badge      | `bg-red-100 text-red-900`        |

### 2.4 Status palette

Badges, only as soft tint (`-50`/`-100` bg) with `-800`/`-900` text:

| Status      | Tint                    |
| ----------- | ----------------------- |
| created     | amber                   |
| approved    | blue                    |
| denied      | zinc                    |
| implemented | emerald                 |
| failed      | red (semantic)          |

Status is always conveyed by the label text too — never color alone.

## 3. Typography

Geist Sans for UI (`--font-geist-sans`), Geist Mono for commit hashes, agent
instructions, code (`--font-geist-mono`). Set on `body` via `font-sans`; no
system-font fallback in `globals.css`.

| Role    | Classes                                   |
| ------- | ----------------------------------------- |
| Display | `text-3xl font-semibold tracking-tight`   |
| H1      | `text-2xl font-semibold tracking-tight`   |
| H2      | `text-base font-medium`                   |
| Body    | `text-sm text-foreground`                 |
| Prose   | `text-base leading-7 text-muted`          |
| Small   | `text-xs text-muted`                      |
| Micro   | `text-xs font-medium text-faint`          |
| Code    | `font-mono text-xs`                       |

Rules: sentence case everywhere. No all-caps. Use `tabular-nums` for aligned
figures. Tighten tracking only at 24 px and above. Line length ≤ 75ch for prose.

## 4. Spacing and layout

- 4 px base unit; all spacing in multiples of 4.
- Page container: `mx-auto w-full max-w-5xl px-6`.
- Header: `py-4`, bottom hairline `border-border`.
- Card padding: `px-5 py-4`; section gaps: `mt-4`–`mt-6`.
- Grid gaps: `gap-3` for controls, `gap-4` for content, `gap-6` for sections.
- Generous whitespace: when in doubt, one step larger, not one smaller.

## 5. Shape, borders, elevation

- Radius: `rounded-md` (6 px) for buttons, inputs, badges-as-rect; `rounded-lg`
  (8 px) for cards, images, panels; `rounded-full` only for status pills.
- Borders: always 1 px, `border-border`; inner dividers `border-border-subtle`.
- Shadows: `shadow-sm` on cards only. Buttons communicate elevation via
  background change, never shadow.
- No outlines thicker than 2 px (focus ring excepted).

## 6. Components

All examples use semantic tokens from §2.

### Buttons

```tsx
// Primary — exactly one per view
"rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"

// Secondary — white surface, hairline border
"rounded-md border border-zinc-300 bg-surface px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"

// Ghost — text-only
"rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-zinc-100 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"

// Destructive (Deny, delete) — ghost that turns red on intent
"rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
```

Disabled: `disabled:opacity-50 disabled:pointer-events-none`. Hit target ≥ 32 px,
prefer 36 px. Never two primary buttons side by side; pair primary with ghost.

### Inputs and forms

```tsx
"w-full rounded-md border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-accent-600 focus:outline-2 focus:outline-offset-0 focus:outline-accent-600"
```

Labels: `text-sm font-medium text-foreground`, above the field, `mb-1.5`.
Errors: `text-xs text-red-700` plus `border-red-600` on the field. Error
text names the problem and the fix; no exclamation marks.

### Cards

```tsx
"rounded-lg border border-border bg-surface shadow-sm"
```

Header row inside a card: `border-b border-border-subtle px-5 py-4`. A card holds
one idea; title, metadata, and actions live in the header row.

### Badges

```tsx
"rounded-full px-2 py-0.5 text-xs font-medium bg-<tint>-100 text-<tint>-900"
```

### Links

`text-accent-800 hover:text-accent-700 hover:underline underline-offset-2`.
Links inside body copy are always underlined; standalone links (nav, actions)
are not until hover.

### Header / nav

White surface, `border-b border-border`, container per §4. Wordmark
`text-lg font-semibold tracking-tight`. Active nav item: `text-foreground` with
a 2 px accent bottom border; inactive: `text-muted`.

### Tabs

Underline tabs: container `border-b border-border`; inactive `text-muted
hover:text-foreground`; active `font-medium text-foreground` plus a 2 px
`bg-accent-600` indicator animated with Motion `layoutId` (§7).

### Tables and lists

Hairline row dividers (`border-border-subtle`), no zebra striping, no vertical
rules. Numeric columns right-aligned with `tabular-nums`. Row hover:
`hover:bg-accent-50/50`.

### Media

Screenshots and previews: `rounded-md border border-border object-cover
object-top`. Always inside a `<figure>` with a `text-xs font-medium text-faint`
caption. Code surfaces: `rounded-md bg-zinc-50 p-3 font-mono text-xs`.

### Empty and loading states

Centered, `py-16`, one sentence of `text-sm text-muted`, at most one action.
Skeletons are `bg-zinc-100 rounded-md animate-pulse`; no spinners where a
skeleton fits.

## 7. Motion (motion.dev)

Library: `motion` v14, React API from `motion/react`. Motion is allowed only in
client components; server components pass content through the client primitives
in `src/components/motion-primitives.tsx`.

Root config: `<MotionProvider>` (in the root layout) sets
`<MotionConfig reducedMotion="user" transition={{ duration: 0.15, ease: "easeOut" }}>`.
Reduced motion is handled globally — never override it per component.

Allowed patterns:

| Pattern                        | Values                                                   |
| ------------------------------ | -------------------------------------------------------- |
| Mount fade + slide             | opacity 0→1, translateY ≤ 8 px, ≤ 200 ms                 |
| List mount stagger             | 40 ms per item, cap 8 items                              |
| Layout animation               | `layout`, `layoutId` (tab indicator, row reorder)        |
| Add/remove rows, alerts        | `AnimatePresence`, fade + ≤ 8 px slide                   |
| Press feedback                 | `whileTap={{ scale: 0.98 }}` on primary/destructive only |

Forbidden: spring/bounce/elastic easing, durations > 200 ms, parallax,
scroll-linked animation, animating width/height/top/left (use `layout` or
transforms), entrance translations > 8 px, and any motion in server components.
Hover feedback stays CSS `transition-colors` (§6).

## 8. Accessibility

- WCAG 2.1 AA contrast minimum. `accent-600` (`#18181B`) on white is 16.5:1
  (AAA), so the accent passes at every text size.
- Focus is never removed: 2 px `outline-accent-600`, offset 2 px, via
  `focus-visible`; inputs use `focus`.
- Status, errors, and required fields are never encoded by color alone.
- Minimum text size 12 px (metadata only); body is 14 px. Target size ≥ 32 px.
- Semantic elements first: `button`, `a`, `form`, `label`, `table`, `figure`.
- Motion respects `prefers-reduced-motion` through `MotionConfig`.

## 9. Tailwind v4 wiring

`globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-border: #e4e4e7;
  --color-border-subtle: #f4f4f5;
  --color-foreground: #18181b;
  --color-muted: #52525b;
  --color-faint: #a1a1aa;

  --color-accent-50: #f4f4f5;
  --color-accent-100: #e4e4e7;
  --color-accent-200: #d4d4d8;
  --color-accent-600: #18181b;
  --color-accent-700: #3f3f46;
  --color-accent-800: #18181b;

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
}
```

Notes:
- No `@theme inline` re-export, no `prefers-color-scheme` block: light only.
- `font-sans` is applied on `<body>`; the Geist variables come from
  `layout.tsx`.
- Red stays the stock Tailwind `red` scale (semantic danger, §2.3).

## 10. Do / Don't

| Do                                   | Don't                                  |
| ------------------------------------ | -------------------------------------- |
| White surfaces, one hairline border  | Gray-on-gray panels, nested cards      |
| Near-black for one action and focus  | Black headings, black borders everywhere |
| Red only for errors and destructive  | Red as a decorative accent             |
| Sentence case, 14 px body            | Uppercase labels, 11 px text           |
| `gap-4` when unsure                  | Dense `gap-1` stacks                    |
| Ghost buttons for secondary actions  | Two solid buttons competing            |
| Tint + text badges                   | Color-only status dots                 |
| CSS color transitions on hover       | Motion springs, bounce, long entrances |

## 11. Migration notes

Applied across `apps/web`: token-based palette, near-black primary actions,
motion primitives, focus rings. Rules for future work:

1. New interactive elements use §6 recipes verbatim; no raw `zinc-*` for
   surfaces (tints excepted).
2. New motion uses the §7 allowed table only; add patterns to the table first.
3. Never reintroduce `prefers-color-scheme` or `@theme inline`.
4. Any new accent usage must fit the §2.2 budget.
