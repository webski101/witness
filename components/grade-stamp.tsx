import { cn } from "@/lib/utils";
import type { Grade, VerdictStatus } from "@/lib/witness/types";

const gradeCopy: Record<Grade, string> = { buy: "BUY", caution: "CAUTION", "do-not-buy": "DO NOT BUY", inconclusive: "INCONCLUSIVE" };

export function GradeStamp({ grade, className }: { grade: Grade; className?: string }) {
  return <span className={cn("stamp inline-flex border-2 px-3 py-1 font-mono text-sm font-black", grade === "buy" ? "border-foreground text-foreground" : "border-destructive text-destructive", className)}>{gradeCopy[grade]}</span>;
}

export function VerdictStamp({ status }: { status: VerdictStatus }) {
  return <span className={cn("stamp inline-flex border px-2 py-0.5 font-mono text-xs font-bold", status === "HELD" ? "border-foreground text-foreground" : "border-destructive text-destructive")}>{status}</span>;
}
