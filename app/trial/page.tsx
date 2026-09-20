import type { Metadata } from "next";
import { TrialConsole } from "@/components/trial-console";
import { DEMO_SELLERS } from "@/lib/witness/demos";

export const metadata: Metadata = { title: "Open a trial" };

export default function TrialPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mb-10 max-w-3xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Trial console</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Claims enter. Evidence leaves.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose a deterministic seller or submit a hostile custom endpoint. Witness executes, records, judges, and signs.
        </p>
      </div>
      <TrialConsole demos={DEMO_SELLERS} />
    </main>
  );
}
