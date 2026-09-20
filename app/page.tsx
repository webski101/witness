import Link from "next/link";
import { ArrowRight, FileLock2, ShieldCheck, TimerReset, Ban } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GradeStamp, VerdictStamp } from "@/components/grade-stamp";
import { cn } from "@/lib/utils";

const streamLines = [
  { t: "12:01:04.102", a: "clerk", e: "admitTurn service:witness.trial", d: "ALLOWED" },
  { t: "12:01:04.188", a: "skeptic", e: "http.fetch seller", d: "DENIED" },
  { t: "12:01:04.241", a: "examiner", e: "read dockets/wkt_foreign", d: "DENIED" },
  { t: "12:01:04.310", a: "examiner", e: "POST /universal-reason #1 187ms", d: "ALLOWED" },
  { t: "12:01:04.498", a: "examiner", e: "POST /universal-reason #2 191ms", d: "ALLOWED" },
  { t: "12:01:04.612", a: "notary", e: "claim lat → FAILED", d: "FAILED" },
  { t: "12:01:04.640", a: "notary", e: "claim isolation → FAILED leak", d: "FAILED" },
  { t: "12:01:04.701", a: "notary", e: "crypto.sign-docket Ed25519", d: "ALLOWED" },
  { t: "12:01:04.744", a: "host", e: "grade do-not-buy · digest a91f…", d: "SIGNED" },
];

export default function HomePage() {
  const doubled = [...streamLines, ...streamLines];

  return (
    <main>
      {/* THESIS: live probe console — brand-first, evidence stream as dominant plane, no paper card hero */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="scanlines absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-[1400px] items-stretch gap-10 px-4 py-12 sm:px-6 md:grid-cols-12 lg:px-10 lg:py-0">
          <div className="flex flex-col justify-center md:col-span-6 lg:col-span-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Witness · live due diligence</p>
            <h1 className="mt-5 text-[clamp(3.4rem,9vw,6.4rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
              WITNESS
            </h1>
            <p className="mt-6 max-w-md text-xl leading-snug text-foreground/90">
              Other agents will exaggerate. Witness calls the product.
            </p>
            <p className="mt-4 max-w-sm text-base text-muted-foreground">Spend 8 credits before risking 20.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/trial" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
                Open a trial <ArrowRight data-icon="inline-end" />
              </Link>
              <Link href="/call" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}>
                Call the API
              </Link>
            </div>
          </div>

          <div className="relative md:col-span-6 lg:col-span-7">
            <div className="absolute inset-y-0 right-0 hidden w-px bg-border md:block" aria-hidden="true" />
            <div className="console-panel relative flex h-full min-h-[420px] flex-col overflow-hidden md:min-h-full md:border-y-0 md:border-r-0 md:border-l">
              <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 font-mono text-[11px]">
                <span className="flex items-center gap-2 text-accent">
                  <span className="size-1.5 rounded-full bg-accent signal-breathe" />
                  LIVE TRACE · OmniBrain XL
                </span>
                <GradeStamp grade="do-not-buy" />
              </div>
              <div className="stream-mask relative flex-1 overflow-hidden px-4 py-4">
                <div className="stream-scroll flex flex-col gap-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  {doubled.map((line, index) => (
                    <div key={`${line.t}-${index}`} className="grid grid-cols-[88px_72px_1fr_auto] items-baseline gap-3">
                      <span className="text-foreground/45">{line.t}</span>
                      <span className="text-accent/80">{line.a}</span>
                      <span className="truncate text-foreground/80">{line.e}</span>
                      <span
                        className={cn(
                          "justify-self-end",
                          line.d === "DENIED" || line.d === "FAILED" ? "text-destructive" : "text-accent",
                        )}
                      >
                        {line.d}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border/80 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {(["Under 50ms", "Japanese capability", "Tenant isolation"] as const).map((claim) => (
                    <div key={claim} className="flex items-center gap-2 border border-border/70 bg-background/40 px-2.5 py-1.5 text-xs">
                      <span>{claim}</span>
                      <VerdictStamp status="FAILED" />
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] text-muted-foreground">Synthetic demo trace · Ed25519 signed · denials recorded</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/70">
        <div className="mx-auto grid max-w-[1400px] md:grid-cols-2">
          <div className="border-b border-border/70 p-8 md:border-r md:border-b-0 lg:p-12">
            <p className="font-mono text-5xl font-semibold tracking-[-0.06em] text-accent">8</p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Probe one claim</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">A cheap factual check before a larger spend.</p>
          </div>
          <div className="p-8 lg:p-12">
            <p className="font-mono text-5xl font-semibold tracking-[-0.06em] text-accent">15</p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Docket two or more</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">A fuller trial with one verdict per advertised claim.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
          A verdict must survive contact with the service.
        </h2>
        <div className="mt-12 grid gap-px bg-border md:grid-cols-2">
          {(
            [
              [TimerReset, "Real execution", "Timed calls, schema checks, capability probes, availability, and tenant canaries."],
              [ShieldCheck, "SharedOS isolation", "Docket-scoped grants. Forbidden fetches, reads, and signatures are genuinely denied."],
              [FileLock2, "Signed evidence", "Canonical dockets signed with Ed25519 and verifiable from the public-key endpoint."],
              [Ban, "No guessed verdicts", "Missing evidence becomes ESCALATED and inconclusive — never an invented success."],
            ] as const
          ).map(([Icon, title, copy]) => (
            <div key={title} className="bg-background p-7 lg:p-10">
              <Icon className="text-accent" aria-hidden="true" />
              <h3 className="mt-8 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
              <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
