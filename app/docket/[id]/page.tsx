import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Copy, FileCheck2, KeyRound } from "lucide-react";
import { GradeStamp, VerdictStamp } from "@/components/grade-stamp";
import { TimelineTable } from "@/components/timeline-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timelineFromAudit } from "@/lib/kernel/witness-kernel";
import { getStore } from "@/lib/witness/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Docket ${id}` };
}

export default async function DocketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const docket = await store.getDocket(id);
  if (!docket) notFound();
  const timeline = timelineFromAudit(await store.getAuditEvents(id));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <header className="grid gap-8 border-b border-border/80 pb-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Signed evidence docket / {docket.id}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{docket.productName}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{docket.summary}</p>
        </div>
        <GradeStamp grade={docket.grade} className="self-start text-sm" />
      </header>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        <div className="console-panel p-5">
          <p className="font-mono text-[11px] text-muted-foreground">SERVICE</p>
          <p className="mt-2 font-semibold">{docket.serviceName}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{docket.targetUrl}</p>
        </div>
        <div className="console-panel p-5">
          <p className="font-mono text-[11px] text-muted-foreground">PRICE</p>
          <p className="mt-2 text-2xl font-semibold text-accent">{docket.priceCredits} credits</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{docket.claims.length} claims tried</p>
        </div>
        <div className="console-panel p-5">
          <p className="font-mono text-[11px] text-muted-foreground">TRUST</p>
          <p className="mt-2 font-semibold">{docket.signatureAlgorithm}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{docket.trustEnvironment} key</p>
        </div>
      </div>

      <Tabs defaultValue="claims" className="mt-12">
        <TabsList variant="line">
          <TabsTrigger value="claims">Claims and evidence</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
          <TabsTrigger value="signature">Signature</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="mt-6">
          <div className="flex flex-col gap-4">
            {docket.claims.map((claim) => {
              const verdict = docket.verdicts.find((item) => item.claimId === claim.id)!;
              const evidence = docket.evidence.find((item) => item.claimId === claim.id)!;
              return (
                <article key={claim.id} className="console-panel overflow-hidden">
                  <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-[-0.03em]">{claim.statement}</h2>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {claim.kind} / claim:{claim.id}
                      </p>
                    </div>
                    <VerdictStamp status={verdict.status} />
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm leading-relaxed">{verdict.reason}</p>
                    <pre className="mt-5 max-h-72 overflow-auto border border-border/70 bg-background/50 p-4 font-mono text-xs leading-relaxed">
                      {JSON.stringify(evidence.normalized, null, 2)}
                    </pre>
                  </div>
                  <div className="border-t border-border/80 px-5 py-3 font-mono text-[11px] text-muted-foreground">
                    {evidence.raw.length} real execution{evidence.raw.length === 1 ? "" : "s"} captured
                  </div>
                </article>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            These entries are projections of real SharedOS audit events. The required forbidden operations are visible as DENIED.
          </p>
          <TimelineTable timeline={timeline} />
        </TabsContent>

        <TabsContent value="signature" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="console-panel overflow-hidden">
              <div className="border-b border-border/80 px-5 py-4">
                <FileCheck2 className="text-accent" />
                <h2 className="mt-3 font-semibold tracking-[-0.03em]">Signed docket digest</h2>
                <p className="mt-1 text-sm text-muted-foreground">SHA-256 over the canonical unsigned docket.</p>
              </div>
              <p className="break-all px-5 py-4 font-mono text-xs text-accent/90">{docket.unsignedDigest}</p>
            </section>
            <section className="console-panel overflow-hidden">
              <div className="border-b border-border/80 px-5 py-4">
                <KeyRound className="text-accent" />
                <h2 className="mt-3 font-semibold tracking-[-0.03em]">Public-key identity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {docket.trustEnvironment === "development"
                    ? "Development evidence only. Production requires persistent environment keys."
                    : "Production key supplied by the deployment environment."}
                </p>
              </div>
              <p className="break-all px-5 py-4 font-mono text-xs">{docket.publicKeyId}</p>
            </section>
          </div>
          <section className="console-panel mt-4 overflow-hidden">
            <div className="border-b border-border/80 px-5 py-4">
              <Copy className="text-accent" />
              <h2 className="mt-3 font-semibold tracking-[-0.03em]">Ed25519 signature</h2>
              <p className="mt-1 text-sm text-muted-foreground">Verify against GET /api/v1/public-key.</p>
            </div>
            <p className="break-all px-5 py-4 font-mono text-xs leading-relaxed">{docket.signature}</p>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
