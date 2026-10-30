# Data and states

## Fetching (React Query or plain hooks)
Keep dashboard components dumb: they take numbers/arrays. Put data access in hooks (`useStats()`), return `{ data, isLoading, error }`.

```tsx
// Supabase example (server-aggregated; never aggregate big tables in the browser)
const { data } = await supabase.rpc("dashboard_stats", { from: start, to: end });
```
Create the aggregate as a SQL view/RPC (`count`, `sum`, `date_trunc`) so the screen loads one row, not thousands. Add RLS so only admins can read it.

## Realtime
```tsx
useEffect(() => {
  const ch = supabase.channel("orders").on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => refetch()).subscribe();
  return () => { supabase.removeChannel(ch); };
}, []);
```
Refetch the aggregate, then pass the new value into the same `<AnimatedNumber>` — it glides.

## Free-tier keep-alive / backups
If the project uses Supabase free tier, the dashboard should surface "last backup" and "last ping" as small status stats so downtime is visible.

## States (every widget needs all four)
- **Loading**: skeleton with the card's real shape (`animate-pulse` bg-black/5 blocks). Never a spinner over a blank page. Numbers show `—`, not `0`.
- **Empty**: one sentence + one action ("Chưa có đơn hàng. Tạo đơn đầu tiên").
- **Error**: say what failed and offer Retry; keep other widgets alive (isolate with error boundaries per card).
- **Stale**: if realtime drops, show a small "Mất kết nối, đang thử lại" chip.

## Tables
Use TanStack Table for sort/filter/pagination; server-side pagination above ~200 rows; row actions as icon buttons with `aria-label`; bulk actions appear in an ink bar sliding up from the bottom.

## Formatting
`Intl.NumberFormat("vi-VN")` for numbers, `{ style: "currency", currency: "VND", maximumFractionDigits: 0 }` for money, compact (`notation: "compact"`) only in tight tiles. Dates: `dd/MM/yyyy`, relative ("2 phút trước") in feeds.
