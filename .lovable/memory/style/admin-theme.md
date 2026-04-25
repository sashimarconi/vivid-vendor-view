---
name: Admin Theme - Premium Void
description: Premium dark SaaS theme with refined purple/blue accents, no neon glow, Inter font
type: design
---
# Admin Theme

## Philosophy
- Premium, clean, high-end SaaS (Stripe/Linear/Vercel inspired)
- Dark "Void / Galaxy" concept — subtle, not flashy
- No neon glow, no heavy gradients, no visual clutter

## Colors (HSL)
- Background: 240 10% 4% (near black)
- Card surface: 240 6% 9%
- Muted surface: 240 6% 13%
- Border: 230 15% 16% (subtle, often at /60 opacity)
- Primary accent: 263 70% 58% (deep purple)
- Secondary accent: 199 89% 48% (soft blue)
- Text: 210 20% 92% / Muted text: 220 10% 50%
- Success: 152 60% 48%, Warning: 38 92% 50%, Danger: 0 72% 55%

## Typography
- Font: Inter for everything (display + body)
- Headings: font-bold tracking-tight (no Montserrat)
- Labels: text-[10px]-[11px] uppercase tracking-wide
- Data: font-mono for numbers

## Spacing
- space-y-8 between major sections
- gap-3 for card grids
- p-5/p-6 card padding, p-4 for compact cards

## Components
- Cards: border-border/60, no backdrop-blur, hover:bg-muted/30
- Charts: strokeWidth 1.5, vertical={false} grid, subtle gradients (0.15 opacity)
- Tables: hover:bg-muted/30, border-border/40 rows, uppercase tracking headers
- Sidebar: 220px width, bg at 95% opacity, items py-[7px] text-[13px]
- Spinners: border-2 border-transparent border-t-accent (no glow)
- Buttons: subtle, no glow on hover
