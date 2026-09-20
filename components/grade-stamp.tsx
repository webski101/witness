import { cn } from "@/lib/utils";
import type { Grade, VerdictStatus } from "@/lib/witness/types";

const gradeCopy: Record<Grade, string> = {
  buy: "BUY",
  caution: "CAUTION",
  "do-not-buy": "DO NOT BUY",
  inconclusive: "INCONCLUSIVE",
};

export function GradeStamp({ grade, className }: { grade: Grade; className?: string }) {
  return (
    <span
      className={cn(
        "stamp inline-flex border px-2.5 py-1 font-mono text-[11px] font-bold",
        grade === "buy" && "border-accent/70 bg-accent/10 text-accent",
        grade === "caution" && "border-[color:var(--caution)]/70 bg-[color:var(--caution)]/10 text-[color:var(--caution)]",
        grade === "do-not-buy" && "border-destructive/70 bg-destructive/10 text-destructive",
        grade === "inconclusive" && "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {gradeCopy[grade]}
    </span>
  );
}

export function VerdictStamp({ status }: { status: VerdictStatus }) {
  return (
    <span
      className={cn(
        "stamp inline-flex border px-2 py-0.5 font-mono text-[10px] font-bold",
        status === "HELD" && "border-accent/70 bg-accent/10 text-accent",
        status === "FAILED" && "border-destructive/70 bg-destructive/10 text-destructive",
        status === "ESCALATED" && "border-[color:var(--caution)]/70 bg-[color:var(--caution)]/10 text-[color:var(--caution)]",
      )}
    >
      {status}
    </span>
  );
}
