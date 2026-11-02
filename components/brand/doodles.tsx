import { cn } from "@/lib/utils";

/** Hand-drawn white doodles that float around the cards. Always decorative. */

export function CrownDoodle({ className, width = 50 }: { className?: string; width?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width}
      height={(width * 40) / 56}
      viewBox="0 0 56 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("pointer-events-none absolute text-white", className)}
    >
      <path d="M4 32 L8 8 L18 20 L28 4 L36 20 L48 8 L50 32 Z" />
      <path d="M6 36 Q28 30 50 36" />
    </svg>
  );
}

export function HeartDoodle({ className, width = 36 }: { className?: string; width?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width}
      height={(width * 40) / 44}
      viewBox="0 0 44 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("pointer-events-none absolute text-white", className)}
    >
      <path d="M22 36 C10 28 3 21 3 12 A9 9 0 0 1 22 9 A9 9 0 0 1 41 12 C41 21 34 28 22 36 Z" />
    </svg>
  );
}
