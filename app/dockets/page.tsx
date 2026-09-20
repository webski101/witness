import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GradeStamp } from "@/components/grade-stamp";
import { getStore } from "@/lib/witness/store";

export const metadata: Metadata = { title: "Dockets" };
export const dynamic = "force-dynamic";

export default async function DocketsPage() {
  const dockets = await getStore().listDockets();
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Evidence archive</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">The docket room</h1>
        <p className="mt-4 text-lg text-muted-foreground">Durable results from real seller executions.</p>
      </div>
      {dockets.length ? (
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {dockets.map((docket) => (
            <article key={docket.id} className="console-panel flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">{docket.productName}</h2>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {docket.id} / {docket.serviceName}
                  </p>
                </div>
                <GradeStamp grade={docket.grade} />
              </div>
              <p className="flex-1 px-5 py-4 text-sm leading-relaxed text-muted-foreground">{docket.summary}</p>
              <div className="border-t border-border/80 px-5 py-3">
                <Link href={`/docket/${docket.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                  Open docket <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="console-panel mt-12 border-dashed p-10">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">No signed dockets yet</h2>
          <p className="mt-2 text-muted-foreground">Run Plainword, OmniBrain XL, or Northstar to create the first durable record.</p>
          <Link href="/trial" className="mt-5 inline-block font-semibold text-accent underline underline-offset-4">
            Open a trial
          </Link>
        </div>
      )}
    </main>
  );
}
