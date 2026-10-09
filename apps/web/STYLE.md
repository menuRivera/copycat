# Visual Style Guide & Specification (STYLE.md)

This document defines the design tokens, component architecture, styling rules, and animation guidelines for the Next.js and Tailwind CSS web application, based on a soft, modern light-theme neomorphic aesthetic.

---

## 1. Design Tokens & Palette

### Color Palette

The color system relies on slate-gray tints to create high-contrast depth and subtle surface layers.

| Token Name                | Hex Value | Usage                                                 |
| :------------------------ | :-------- | :---------------------------------------------------- |
| **Background / Canvas**   | `#EFF2F9` | Main page background                                  |
| **Surface / Card**        | `#E4EBF1` | Card containers, input surfaces, active elements      |
| **Muted Text / Border**   | `#B5BFC6` | Secondary typography, subtle borders, disabled states |
| **Primary Text / Accent** | `#6E7F8D` | Primary headings, body text, dark accents             |

### Shadow Tokens

Depth is constructed using dual light/dark drop-shadow and inner-shadow compositions.

- **Light Highlight (`Shadow 1`):** `#FAFBF1` at 100% opacity
- **Dark Shadow (`Shadow 2`):** `#161B1D` at 23% opacity (rgba: `rgba(22, 27, 29, 0.23)`)

#### Neomorphic Shadow Tiers

- **Level 1 (Subtle / Buttons / Small Cards):**
  - Light Offset: `-5px -5px`, Blur: `10px`
  - Dark Offset: `5px 5px`, Blur: `10px`
- **Level 2 (Default Cards / Floating Panels):**
  - Light Offset: `-10px -10px`, Blur: `20px`
  - Dark Offset: `10px 10px`, Blur: `20px`
- **Level 3 (Modals / Prominent Floating UI):**
  - Light Offset: `-20px -20px`, Blur: `40px`
  - Dark Offset: `20px 20px`, Blur: `40px`
- **Inset (Inputs / Pressed States):**
  - Inner Light: `inset -5px -5px 10px #FAFBF1`
  - Inner Dark: `inset 5px 5px 10px rgba(22, 27, 29, 0.23)`

### Typography

- **Headings:** Campton (Fallback: `system-ui`, sans-serif)
- **Body / UI Text:** Avenir Next (Fallback: `Inter`, `sans-serif`)

---

## 2. Tailwind CSS Configuration

Extend your `tailwind.config.ts` to include the design system tokens:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#EFF2F9',
        surface: '#E4EBF1',
        muted: '#B5BFC6',
        heading: '#6E7F8D',
      },
      fontFamily: {
        heading: ['Campton', 'sans-serif'],
        body: ['Avenir Next', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        // Outer Shadows
        'soft-sm': '-5px -5px 10px #FAFBF1, 5px 5px 10px rgba(22, 27, 29, 0.23)',
        'soft-md': '-10px -10px 20px #FAFBF1, 10px 10px 20px rgba(22, 27, 29, 0.23)',
        'soft-lg': '-20px -20px 40px #FAFBF1, 20px 20px 40px rgba(22, 27, 29, 0.23)',
        // Inset Shadows
        'soft-inset': 'inset -5px -5px 10px #FAFBF1, inset 5px 5px 10px rgba(22, 27, 29, 0.23)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
```
