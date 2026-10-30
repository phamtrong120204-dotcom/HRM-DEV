"use client";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "./motion";

/** Rounded bar chart like the "Impact" tile. Bars grow from the bottom with a stagger. */
export function MiniBars({ data, highlight, height = 96, color = "var(--dash-lilac-strong)" }: { data: number[]; highlight?: number; height?: number; color?: string }) {
  const max = Math.max(...data, 1);
  const reduce = useReducedMotion();
  return (
    <div className="flex items-end gap-2" style={{ height }} role="img" aria-label={`Biểu đồ cột: ${data.join(", ")}`}>
      {data.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 origin-bottom rounded-full"
          style={{ height: `${(v / max) * 100}%`, background: i === highlight ? color : "color-mix(in srgb, var(--dash-lilac-strong) 25%, transparent)" }}
          initial={{ scaleY: reduce ? 1 : 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE, delay: reduce ? 0 : i * 0.05 }}
        />
      ))}
    </div>
  );
}
