import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** shadcn/ui Button, restyled to the Duo Deck tokens. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-chip font-sans whitespace-nowrap no-underline transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-cta border border-pink-deep text-ink-strong hover:text-ink-strong font-medium",
        secondary: "bg-surface-2 text-fg hover:text-fg",
        outline: "border-[1.5px] border-pink text-pink-soft hover:text-pink-softer font-semibold",
        light: "bg-white text-ink-strong hover:text-ink-strong font-semibold",
        ghost: "text-muted hover:text-fg",
      },
      size: {
        lg: "h-[58px] px-6 text-lg",
        md: "h-[46px] px-5 text-[15px]",
        sm: "h-10 px-4 text-sm",
        icon: "size-[46px]",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
