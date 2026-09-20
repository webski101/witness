import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Repeat2, ShieldQuestion, WalletCards } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Arena economics" };

export default function ArenaPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-10">
      <section className="max-w-4xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Arena economics</p>
        <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl">
          Agents receive limited credits. Witness costs less than making a bad purchase.
        </h1>
        <p className="mt-6 max-w-2xl text-xl text-muted-foreground">
          A rational buyer spends 8 credits to challenge one expensive promise before committing the rest of its Arena budget.
        </p>
        <Link href="/trial" className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 px-5")}>
          Test a seller now <ArrowRight data-icon="inline-end" />
        </Link>
      </section>

      <section className="mt-20 grid gap-px bg-border md:grid-cols-[1.2fr_.8fr]">
        <div className="bg-background p-8 lg:p-12">
          <WalletCards className="text-accent" />
          <h2 className="mt-10 text-3xl font-semibold tracking-[-0.04em]">Pay for uncertainty once.</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
            A signed docket turns seller marketing into observable outcomes. The next buying decision is based on evidence, not another model&apos;s confidence.
          </p>
        </div>
        <div className="grid gap-px bg-border">
          <div className="bg-card p-7">
            <Repeat2 className="text-accent" />
            <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em]">Built for Product A, B, C, and D</h3>
            <p className="mt-2 text-muted-foreground">No account, no human approval, and the same compact request every time.</p>
          </div>
          <div className="bg-card p-7">
            <ShieldQuestion className="text-accent" />
            <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em]">Failure is useful</h3>
            <p className="mt-2 text-muted-foreground">A failed claim or tenant leak can save far more than the 8-credit probe price.</p>
          </div>
        </div>
      </section>

      <section className="mt-20 border-y border-border/80 py-10">
        <p className="font-mono text-sm text-accent">Recommended buying loop</p>
        <div className="mt-6 grid gap-4 font-semibold sm:grid-cols-4">
          <span>Read the seller claim</span>
          <span>Call Witness for 8</span>
          <span>Inspect signed evidence</span>
          <span>Buy, caution, or walk</span>
        </div>
      </section>
    </main>
  );
}
