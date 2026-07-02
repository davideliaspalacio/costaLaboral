import { colorScore } from "@/lib/matching";
import { cn } from "@/lib/utils";

/** Píldora con el % de match (motivo sticker, borde de tinta). */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        colorScore(score),
        "inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-1 text-xs font-extrabold tabular-nums",
        className,
      )}
    >
      {score}% match
    </span>
  );
}
