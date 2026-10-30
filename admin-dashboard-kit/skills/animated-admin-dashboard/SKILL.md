---
name: animated-admin-dashboard
description: Build admin panels and dashboards with a soft "bento" look (pastel tiles, white rounded cards, floating black pill sidebar) and polished motion — count-up numbers, growing bars, drawing sparklines, sliding active pills, staggered entrances. Use this skill whenever the user wants an admin page, trang quản trị, dashboard, back office, CMS panel, analytics screen, KPI/stat cards, bảng điều khiển, số liệu chuyển động, animated numbers, or says "giao diện giống Dashboard V18 / kiểu bento / glass card", even if they never say "skill". Also use it when adding a new page, widget or chart to an existing admin built with this kit, or when restyling a plain admin into this look. Targets React/Next.js/Vite + Tailwind + framer-motion + lucide-react.
---

# Animated Admin Dashboard

A reusable design language + ready-made components for admin panels. The look comes from a reference video the user supplied ("Dashboard V18"): lavender page background, large-radius white cards, pastel accent tiles (lilac / pink / mint / sky), one near-black card for emphasis, a floating black pill sidebar with tooltips, filter pills, big tabular numbers, and subtle motion.

Reply to the user in the language they write in (usually Vietnamese). Code and identifiers stay in English.

## Workflow

1. **Understand the data, not just the look.** Before any UI: list the 3–6 numbers/lists the admin actually needs to see (revenue, orders, users, tasks…), where they come from (Supabase table, API, Google Sheet), and who reads the screen. If unknown, propose a concrete guess and confirm in one sentence. Do not invent metrics the business doesn't have.
2. **Install the kit once per project** (skip if `src/components/dashboard/` already exists):
   - `npm i framer-motion lucide-react` (Tailwind assumed; if absent, tell the user and ask before installing).
   - Copy `assets/components/*` → `src/components/dashboard/`, `assets/tokens.css` → imported from the global CSS. Add `className="dash-root"` to the layout root. Add `.dark` class toggling only if the user wants dark mode.
   - Next.js App Router: files already start with `"use client"` where needed.
3. **Plan the layout as a bento grid** (12 columns). Put the single most important number in the black `ink` card or the lilac hero tile; everything else white or pastel. Sketch it as ASCII in your reply for non-trivial pages. See `references/design-language.md`.
4. **Compose from the kit** (`Card`, `StatCard`, `AnimatedNumber`, `MiniBars`, `Sparkline`, `ProgressBar`, `ActivityList`, `Segmented`, `PillSidebar`, `PageHeader`). `assets/DashboardExample.tsx` shows a full page. Prefer composing over writing new primitives; add a new primitive only when nothing fits, and match the tokens.
5. **Wire real data** and handle loading / empty / error states. See `references/data-and-states.md`.
6. **Check against the quality floor** below before saying you're done. For big builds, hand off to the `dashboard-reviewer` agent if available.

## Rules that make it look right (and not generic)

- **One orchestrated entrance.** `BentoGrid` staggers its cards once on mount. Do not add extra fade-ins to inner sections. Hover lift only on cards that are actually clickable (`interactive`).
- **Numbers are the motion.** Every KPI uses `AnimatedNumber` (counts up on first view, glides between values on updates). Always `tabular-nums`; always format with the locale (`vi-VN` → `1.234,5`).
- **Motion answers state.** Active nav item and active filter use shared-layout pills (`layoutId`); bars grow, lines draw, progress fills — each once, on first view.
- **Hierarchy through color, not borders.** Pastel tiles mark categories; at most one `ink` card per screen; no outlines, no decorative gradients.
- **Radius scale**: 28px cards, 20px inner blocks, 12px chips, full pills for nav/filters.
- **Copy**: sentence case, user vocabulary ("Khách hàng mới", not "new_users_count"), buttons say what they do ("Lưu thay đổi"). Empty states tell what to do next.
- Don't ship the demo numbers. Placeholder data must be clearly marked as such in code comments and replaced before launch.

## Quality floor (verify, don't assume)

- Responsive: sidebar collapses to a bottom bar or drawer under `md`; grid spans reflow `col-span-12 → sm:6 → xl:4`.
- `prefers-reduced-motion`: `BentoGrid` wraps `MotionConfig reducedMotion="user"`; `AnimatedNumber`, bars and lines skip animation when reduced.
- Keyboard: every control reachable, visible focus ring, `aria-current` on nav, `role="tablist"` on filters, `role="progressbar"` with values, charts have `aria-label`.
- Contrast ≥ 4.5:1 for text on pastel tiles (the muted grey is for secondary text on white only).
- Performance: animate `transform`/`opacity`/`width` only; numbers write to the DOM via motion values (no per-frame React renders); avoid animating more than ~30 elements at once — lists beyond that should not stagger.

## References (read when needed)

- `references/design-language.md` — palette, type, spacing, layout recipes for common admin pages (overview, list/table, detail, settings).
- `references/motion.md` — motion timings, springs, what to animate and what not to.
- `references/data-and-states.md` — Supabase/REST wiring, realtime updates into `AnimatedNumber`, skeleton/empty/error patterns, tables.
