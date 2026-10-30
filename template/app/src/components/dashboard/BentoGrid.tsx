"use client";
import { motion, MotionConfig } from "framer-motion";
import { cn } from "./cn";
import { gridVariants } from "./motion";

/** 12-col bento grid. Children (<Card>) pick spans via className, e.g. "col-span-12 md:col-span-6 xl:col-span-4". */
export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className={cn("grid grid-cols-12 gap-4 md:gap-5", className)}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
