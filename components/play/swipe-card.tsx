"use client";

import type { ReactNode } from "react";
import { m, useMotionValue, useReducedMotion, useTransform, type PanInfo, type Variants } from "framer-motion";

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 500;
/** A fast flick still needs this much travel, so a tap's jitter never swipes. */
const FLICK_MIN_DISTANCE = 40;
/** Resting tilt from the design. */
const BASE_TILT = -2;

/** Direction-aware enter/exit. Only transform + opacity animate (60 fps rule). */
const swipe: Variants = {
  enter: (dir: number) => (dir >= 0 ? { opacity: 0, scale: 0.94, x: 0 } : { opacity: 0, scale: 1, x: -360 }),
  center: { opacity: 1, scale: 1, x: 0, transition: { type: "spring", stiffness: 420, damping: 36 } },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? -480 : 480,
    transition: { duration: 0.26, ease: [0.4, 0, 1, 1] },
  }),
};

/** prefers-reduced-motion: a plain cross-fade. */
const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/**
 * Draggable card (GP-1): swipe left → next, swipe right → previous.
 * The card follows the finger; with reduced motion it stays put and the
 * gesture is still recognised. Use inside <AnimatePresence custom={dir}>.
 */
export function SwipeCard({
  children,
  onNext,
  onPrev,
  canPrev,
}: {
  children: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [BASE_TILT - 12, BASE_TILT, BASE_TILT + 12]);

  function handleEnd(_: unknown, { offset, velocity }: PanInfo) {
    const left = offset.x < -SWIPE_DISTANCE || (velocity.x < -SWIPE_VELOCITY && offset.x < -FLICK_MIN_DISTANCE);
    const right = offset.x > SWIPE_DISTANCE || (velocity.x > SWIPE_VELOCITY && offset.x > FLICK_MIN_DISTANCE);
    if (left) onNext();
    else if (right && canPrev) onPrev();
  }

  return (
    <m.div
      className="absolute inset-0 cursor-grab touch-pan-y will-change-transform active:cursor-grabbing"
      style={reduce ? { rotate: BASE_TILT } : { x, rotate }}
      drag={reduce ? false : "x"}
      dragSnapToOrigin
      dragElastic={0.85}
      onDragEnd={reduce ? undefined : handleEnd}
      onPanEnd={reduce ? handleEnd : undefined}
      variants={reduce ? fade : swipe}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {children}
    </m.div>
  );
}
