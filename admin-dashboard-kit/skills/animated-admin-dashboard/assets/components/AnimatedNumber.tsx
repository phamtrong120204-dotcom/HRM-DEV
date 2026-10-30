"use client";
import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { EASE } from "./motion";

type Props = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  locale?: string; // "vi-VN" -> 1.234,5 ; "en-US" -> 1,234.5
  className?: string;
};

/**
 * Counts up on first view, then tweens from the CURRENT value to any new value
 * (so live data updates glide instead of restarting from 0).
 * Writes straight to the DOM node: no React re-render per frame.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.2,
  locale = "vi-VN",
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);

  useEffect(() => {
    const fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const render = (v: number) => {
      if (ref.current) ref.current.textContent = prefix + fmt.format(v) + suffix;
    };
    render(mv.get());
    const unsub = mv.on("change", render);

    if (!inView && !reduce) return unsub; // wait until visible

    const controls = animate(mv, value, {
      duration: reduce ? 0 : duration,
      ease: EASE as unknown as number[],
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, inView, reduce, decimals, prefix, suffix, duration, locale, mv]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
      aria-label={`${prefix}${value}${suffix}`}
    />
  );
}
