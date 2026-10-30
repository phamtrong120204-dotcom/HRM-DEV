"use client";
import { motion } from "framer-motion";
import { listVariants, rowVariants } from "./motion";

export type ActivityItem = { id: string; title: string; meta?: string; avatar?: React.ReactNode; badge?: string };

/** Notification / activity feed. Rows stagger in when the card enters view. */
export function ActivityList({ items, empty = "Chưa có hoạt động nào." }: { items: ActivityItem[]; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-[var(--dash-muted)]">{empty}</p>;
  return (
    <motion.ul variants={listVariants} initial="hidden" whileInView="show" viewport={{ once: true }} className="divide-y divide-[var(--dash-line)]">
      {items.map((it) => (
        <motion.li key={it.id} variants={rowVariants} className="flex items-start gap-3 py-3">
          <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--dash-lilac)] text-xs font-semibold">{it.avatar ?? it.title.slice(0, 1)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{it.title}</p>
            {it.meta && <p className="truncate text-xs text-[var(--dash-muted)]">{it.meta}</p>}
          </div>
          {it.badge && <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{it.badge}</span>}
        </motion.li>
      ))}
    </motion.ul>
  );
}
