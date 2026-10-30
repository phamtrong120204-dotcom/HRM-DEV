"use client";
import { motion } from "framer-motion";
import { cn } from "./cn";
import { SPRING } from "./motion";

export type NavItem = { id: string; label: string; icon: React.ReactNode };

/** Floating black pill rail. Active state is a shared-layout bubble that slides between items. */
export function PillSidebar({ items, active, onSelect, logo, footer }: {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  logo?: React.ReactNode;
  footer?: NavItem;
}) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="sticky top-4 hidden h-[calc(100dvh-2rem)] md:flex w-16 shrink-0 flex-col items-center justify-between rounded-full bg-[#111114] py-5 text-white/70"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="mb-3 grid size-10 place-items-center text-white">{logo}</div>
        {items.map((it) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              aria-current={on ? "page" : undefined}
              aria-label={it.label}
              className={cn(
                "group relative grid size-11 place-items-center rounded-full outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-white",
                on ? "text-[var(--dash-lilac-strong)]" : "hover:text-white",
              )}
            >
              {on && (
                <motion.span layoutId="pill-active" transition={SPRING} className="absolute inset-0 rounded-full bg-[var(--dash-lilac)]" />
              )}
              <span className="relative z-10">{it.icon}</span>
              <span className="pointer-events-none absolute left-full z-20 ml-3 translate-x-[-4px] whitespace-nowrap rounded-lg bg-[#111114] px-2.5 py-1 text-xs text-white opacity-0 shadow-lg transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
      {footer && (
        <button onClick={() => onSelect(footer.id)} aria-label={footer.label} className="grid size-11 place-items-center rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-white">
          {footer.icon}
        </button>
      )}
    </nav>
  );
}

/** Mobile (< md) version: same pill look, horizontal, fixed to the bottom. Show at most 5 items. */
export function BottomPillBar({ items, active, onSelect }: { items: NavItem[]; active: string; onSelect: (id: string) => void }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-full bg-[#111114] p-2 text-white/70 md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {items.slice(0, 5).map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            aria-current={on ? "page" : undefined}
            aria-label={it.label}
            className={cn("relative grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white", on ? "text-[var(--dash-lilac-strong)]" : "")}
          >
            {on && <motion.span layoutId="bottom-pill-active" transition={SPRING} className="absolute inset-0 rounded-full bg-[var(--dash-lilac)]" />}
            <span className="relative z-10">{it.icon}</span>
          </button>
        );
      })}
    </nav>
  );
}
