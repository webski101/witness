import Link from "next/link";
import { ArrowRight, Check, FileLock2, ShieldCheck, TimerReset } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeStamp, VerdictStamp } from "@/components/grade-stamp";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100dvh-6.5rem)] max-w-[1400px] items-center gap-12 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-10">
        <div className="md:col-span-7">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">Independent agent due diligence</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.065em] sm:text-6xl lg:text-7xl">Other agents will exaggerate. Witness calls the product.</h1>
          <p className="mt-6 max-w-lg text-xl leading-relaxed text-muted-foreground">Spend 8 credits before risking 20.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/trial" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>Try Witness <ArrowRight data-icon="inline-end" /></Link><Link href="/call" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}>Call the API</Link></div>
        </div>
        <Card className="paper-shadow md:col-span-5 md:rotate-[1deg]">
          <CardHeader className="border-b ink-rule"><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-xl">Docket wkt_demo</CardTitle><CardDescription className="font-mono">OmniBrain XL / universal-reason</CardDescription></div><GradeStamp grade="do-not-buy" /></div></CardHeader>
          <CardContent className="flex flex-col gap-4 pt-5">{["Under 50ms", "Japanese capability", "Tenant isolation"].map((claim) => <div key={claim} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b pb-4 last:border-0 last:pb-0"><span>{claim}</span><VerdictStamp status="FAILED" /></div>)}</CardContent>
          <CardFooter className="border-t ink-rule bg-muted/45 font-mono text-xs">Ed25519 signed. Authority scoped. Denials recorded.</CardFooter>
        </Card>
      </section>
      <section className="border-y ink-rule bg-card/70"><div className="mx-auto grid max-w-[1400px] md:grid-cols-[1fr_1.3fr]"><div className="border-b p-8 md:border-r md:border-b-0 lg:p-12"><p className="font-mono text-5xl font-semibold tracking-[-0.06em]">8</p><h2 className="mt-2 text-xl font-semibold">Probe one claim</h2><p className="mt-2 text-muted-foreground">A cheap factual check before a larger spend.</p></div><div className="p-8 lg:p-12"><p className="font-mono text-5xl font-semibold tracking-[-0.06em]">15</p><h2 className="mt-2 text-xl font-semibold">Docket two or more</h2><p className="mt-2 text-muted-foreground">A fuller trial with one verdict per advertised claim.</p></div></div></section>
      <section className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6 lg:px-10">
        <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">A verdict must survive contact with the service.</h2>
        <div className="mt-14 grid gap-px border bg-border md:grid-cols-2">{[[TimerReset, "Real execution", "Witness runs timed calls, schema checks, concrete capability tests, availability probes, and tenant canaries."], [ShieldCheck, "SharedOS-enforced isolation", "Each actor receives docket-scoped grants. Forbidden fetches, reads, and signatures are genuinely denied."], [FileLock2, "Signed evidence", "The canonical docket is signed with Ed25519 and can be verified using the public-key endpoint."], [Check, "No guessed verdicts", "Missing evidence becomes ESCALATED and an inconclusive recommendation, never an invented success."]].map(([Icon, title, copy]) => <div key={String(title)} className="bg-background p-7 lg:p-10"><Icon aria-hidden="true" /><h3 className="mt-8 text-xl font-semibold">{String(title)}</h3><p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">{String(copy)}</p></div>)}</div>
      </section>
    </main>
  );
}
