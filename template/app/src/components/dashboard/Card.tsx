"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "./cn";
import { cardVariants, SPRING } from "./motion";

const tones = {
  white: "bg-[var(--dash-surface)] text-[var(--dash-ink)]",
  lilac: "bg-[var(--dash-lilac)] text-[var(--dash-ink)]",
  pink: "bg-[var(--dash-pink)] text-[var(--dash-ink)]",
  mint: "bg-[var(--dash-mint)] text-[var(--dash-ink)]",
  sky: "bg-[var(--dash-sky)] text-[var(--dash-ink)]",
  amber: "bg-[var(--dash-amber)] text-[var(--dash-ink)]",
  ink: "bg-[#111114] text-white",
} as const;
export type CardTone = keyof typeof tones;

const pads = { sm: "p-4", md: "p-5 md:p-6", lg: "p-6 md:p-8" } as const;

type Props = HTMLMotionProps<"section"> & {
  tone?: CardTone;
  pad?: keyof typeof pads;
  /** Only set true for clickable cards: adds hover lift + press feedback. */
  interactive?: boolean;
};

export function Card({ tone = "white", pad = "md", interactive = false, className, children, ...rest }: Props) {
  return (
    <motion.section
      variants={cardVariants}
      whileHover={interactive ? { y: -3 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={SPRING}
      className={cn(
        "rounded-[var(--dash-radius-lg)] shadow-[var(--dash-shadow)]",
        tones[tone],
        pads[pad],
        interactive && "cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--dash-lilac-strong)]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.section>
  );
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-base font-semibold tracking-tight">{children}</h3>
      {action}
    </div>
  );
}
