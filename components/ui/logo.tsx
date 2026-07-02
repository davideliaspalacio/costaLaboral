import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark + mark sticker (sol sobre olas). */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-sol-400 shadow-[2px_2px_0_0_var(--color-ink)] transition-transform group-hover:-rotate-6">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="9" r="3.4" fill="var(--color-accent-500)" stroke="var(--color-ink)" strokeWidth="1.6" />
          <path
            d="M3 17c2.2-2.4 4.4-2.4 6.6 0 2.2 2.4 4.4 2.4 6.6 0 1.5-1.6 3-2.1 4.8-1.5"
            stroke="var(--color-ink)"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">
        Costa<span className="text-brand-600">Laboral</span>
      </span>
    </Link>
  );
}
