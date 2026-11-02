"use client";

import { cn } from "@/lib/utils";

/**
 * Pill-shaped quiz choice (design: Quiz artboard) built on a native
 * radio/checkbox, so arrow keys, Space and screen readers work for free.
 */
export function QuizOption({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  hint,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[62px] cursor-pointer items-center justify-between gap-3 rounded-[31px] border px-[22px] py-2 text-[17px] font-medium transition-colors",
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-pink-softer",
        checked ? "border-pink bg-pink text-ink-strong" : "border-border bg-surface text-white hover:border-dot",
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span>{label}</span>
      {hint && <span className={cn("text-right text-sm font-normal", checked ? "text-[#3A1022]" : "text-muted")}>{hint}</span>}
    </label>
  );
}

/** Step dots: the current step is a wider pill. */
export function StepDots({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="flex gap-1.5" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("h-2.5 rounded-full", i === current ? "w-6 bg-pink" : "w-2.5 bg-dot")}
        />
      ))}
    </div>
  );
}
