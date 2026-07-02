import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Motivo "sticker": borde de tinta + sombra dura + press físico.
const STICKER =
  "border-2 border-ink shadow-[var(--shadow-sticker)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker-lg)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

export const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: `bg-ink text-canvas ${STICKER}`,
        accent: `bg-accent-500 text-white ${STICKER}`,
        sol: `bg-sol-400 text-ink ${STICKER}`,
        brand: `bg-brand-500 text-white ${STICKER}`,
        outline: `bg-surface text-ink ${STICKER}`,
        success: `bg-success-500 text-white ${STICKER}`,
        wsp: `bg-[#25D366] text-ink ${STICKER}`,
        danger: `bg-danger-500 text-white ${STICKER}`,
        // Sin borde/sombra — para navegación y acciones terciarias.
        ghost: "border-2 border-transparent bg-transparent text-ink-soft hover:bg-ink/5 hover:text-ink",
        subtle: "border-2 border-transparent bg-brand-100 text-brand-800 hover:bg-brand-200",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-11 w-11",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  ),
);
Button.displayName = "Button";
