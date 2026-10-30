# Design language (derived from the reference video)

Colors are approximated from screen-recording frames; tune them to the client's brand when one exists (swap `--dash-lilac*` first — it is the identity color).

## Tokens
| Role | Token | Value |
|---|---|---|
| Page | `--dash-bg` | #ece8f2 (lavender grey) |
| Card | `--dash-surface` | #ffffff |
| Ink / emphasis card | `--dash-ink` | #111114 |
| Secondary text | `--dash-muted` | #7b7686 |
| Identity accent | `--dash-lilac` / `-strong` | #cfc4f5 / #5b3fd0 |
| Category tiles | pink, mint, sky, amber | #f7cfe5 #d3ebd7 #d4e3f8 #fbe3b8 |
| Positive / negative | | #1f9d63 / #d6455d |

## Type
One family is enough. Good fits for this look: Inter, Geist, Plus Jakarta Sans, Be Vietnam Pro (best Vietnamese diacritics). Sizes: page title 30–40 / card title 16 / stat number 36–44 semibold / body 14 / meta 12. Tight tracking on big numbers (`tracking-tight`), never all-caps labels.

## Layout recipes (12-col grid, gap 16–20px)
**Overview**
```
[ Hero tile (lilac) 8 ][ Ink KPI 4 ]
[ KPI 4 ][ KPI 4 ][ Bars 4 ]
[ Activity feed 8 ][ Collections/progress list 4 ]
```
**List / table page**: header + filter pills → one white card containing the table (sticky header, row hover = `bg-black/[.03]`), right-side summary card (4 cols) with 2–3 stats.
**Card gallery (like "Saved for later")**: 3-up grid of media cards with pastel placeholder when no image, small type badge top-left, secondary actions as icon buttons bottom-right; right column holds collections with progress bars.
**Detail page**: left 8 cols content, right 4 cols stacked status/ownership/timeline cards.
**Settings**: single column max-w-2xl, grouped in white cards, each with its own "Lưu thay đổi".

## Sidebar
Floating black pill, 64px wide, icon-only, tooltip on hover/focus, active = lilac bubble that slides. Under `md`: turn into a fixed bottom bar with the same items (max 5) — keep the pill look, horizontal.

## Don'ts
No border outlines on cards, no gradient washes as decoration, no more than one ink card, no icon in every card title, no emoji as icons.
