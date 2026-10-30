"use client";
import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "./cn";
import { SPRING } from "./motion";

/** Filter pills (All / Videos / Docs). Selected pill slides between options. */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} className="inline-flex items-center gap-1 rounded-full p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn("relative rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--dash-lilac-strong)]", on ? "text-white" : "text-[var(--dash-muted)] hover:text-[var(--dash-ink)]")}
          >
            {on && <motion.span layoutId={`seg-${id}`} transition={SPRING} className="absolute inset-0 rounded-full bg-[#111114]" />}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
