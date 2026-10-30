"use client";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Card, type CardTone } from "./Card";
import { cn } from "./cn";

type Props = {
  title: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Percent change vs previous period. Sign decides color/arrow. */
  delta?: number;
  tone?: CardTone;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode; // mini chart / progress below the number
};

export function StatCard({ title, value, decimals, prefix, suffix, delta, tone = "white", icon, className, children }: Props) {
  const up = (delta ?? 0) >= 0;
  const onInk = tone === "ink";
  return (
    <Card tone={tone} className={className}>
      <div className="flex items-start justify-between">
        <p className={cn("text-sm", onInk ? "text-white/60" : "text-[var(--dash-muted)]")}>{title}</p>
        {icon && <span className="grid size-9 place-items-center rounded-full bg-black/5">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <AnimatedNumber
          value={value}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          className="text-4xl font-semibold tracking-tight"
        />
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              up ? "bg-emerald-500/15 text-[var(--dash-positive)]" : "bg-rose-500/15 text-[var(--dash-negative)]",
            )}
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </Card>
  );
}
