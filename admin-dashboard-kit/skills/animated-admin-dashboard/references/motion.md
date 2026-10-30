# Motion guide

| Thing | How | Timing |
|---|---|---|
| Page/grid entrance | parent `staggerChildren` | 0.06s step, card 0.55s, ease `[.22,1,.36,1]`, once |
| Numbers | `AnimatedNumber` (motion value → DOM text) | 1.2s count-up on first view; updates tween from current value (0.6–1s) |
| Bars | `scaleY` 0→1, `origin-bottom` | 0.7s, 0.05s stagger |
| Lines | `pathLength` 0→1 | 1.1s |
| Progress | width 0→% | 0.9s |
| Active pill | `layoutId` + spring | stiffness 260, damping 24 |
| Clickable card | hover `y:-3`, tap `scale:.985` | spring |
| Feed rows | stagger when in view | 0.05s step |

## Rules
- Everything plays **once** (`viewport={{ once: true }}`); re-animate only on real data change.
- Animate `transform`, `opacity`, `width`/`pathLength`. Never animate `top/left/height` of layout containers.
- Lists > ~30 rows: no stagger, just render.
- Respect reduced motion (kit does by default). Test by enabling "Reduce motion" in the OS.
- Realtime updates: pass the new number to `AnimatedNumber`; don't remount it (don't change its `key`).
- Don't add looping/ambient animation to admin screens: people stare at them for hours.
