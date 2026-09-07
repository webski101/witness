import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Copy, FileCheck2, KeyRound } from "lucide-react";
import { GradeStamp, VerdictStamp } from "@/components/grade-stamp";
import { TimelineTable } from "@/components/timeline-table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  const docket = store.getDocket(id);
  if (!docket) notFound();
  const timeline = timelineFromAudit(store.getAuditEvents(id));
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <header className="grid gap-8 border-b ink-rule pb-10 md:grid-cols-[1fr_auto]">
        <div><p className="font-mono text-xs text-muted-foreground">SIGNED EVIDENCE DOCKET / {docket.id}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{docket.productName}</h1><p className="mt-3 max-w-2xl text-lg text-muted-foreground">{docket.summary}</p></div><GradeStamp grade={docket.grade} className="self-start text-lg" />
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="border p-5"><p className="font-mono text-xs text-muted-foreground">SERVICE</p><p className="mt-2 font-semibold">{docket.serviceName}</p><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{docket.targetUrl}</p></div>
        <div className="border p-5"><p className="font-mono text-xs text-muted-foreground">PRICE</p><p className="mt-2 text-2xl font-semibold">{docket.priceCredits} credits</p><p className="mt-1 font-mono text-xs text-muted-foreground">{docket.claims.length} claims tried</p></div>
        <div className="border p-5"><p className="font-mono text-xs text-muted-foreground">TRUST</p><p className="mt-2 font-semibold">{docket.signatureAlgorithm}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{docket.trustEnvironment} key</p></div>
      </div>

      <Tabs defaultValue="claims" className="mt-12">
        <TabsList variant="line"><TabsTrigger value="claims">Claims and evidence</TabsTrigger><TabsTrigger value="audit">Audit trail</TabsTrigger><TabsTrigger value="signature">Signature</TabsTrigger></TabsList>
        <TabsContent value="claims" className="mt-6">
          <div className="flex flex-col gap-5">{docket.claims.map((claim) => { const verdict = docket.verdicts.find((item) => item.claimId === claim.id)!; const evidence = docket.evidence.find((item) => item.claimId === claim.id)!; return <Card key={claim.id}><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{claim.statement}</CardTitle><CardDescription className="font-mono">{claim.kind} / claim:{claim.id}</CardDescription></div><VerdictStamp status={verdict.status} /></div></CardHeader><CardContent><p>{verdict.reason}</p><pre className="mt-5 max-h-72 overflow-auto border bg-muted/45 p-4 font-mono text-xs leading-relaxed">{JSON.stringify(evidence.normalized, null, 2)}</pre></CardContent><CardFooter className="border-t font-mono text-xs text-muted-foreground">{evidence.raw.length} real execution{evidence.raw.length === 1 ? "" : "s"} captured</CardFooter></Card>; })}</div>
        </TabsContent>
        <TabsContent value="audit" className="mt-6"><p className="mb-4 max-w-2xl text-sm text-muted-foreground">These entries are projections of real SharedOS audit events. The required forbidden operations are visible as DENIED.</p><TimelineTable timeline={timeline} /></TabsContent>
        <TabsContent value="signature" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><FileCheck2 /><CardTitle>Signed docket digest</CardTitle><CardDescription>SHA-256 over the canonical unsigned docket.</CardDescription></CardHeader><CardContent className="break-all font-mono text-xs">{docket.unsignedDigest}</CardContent></Card><Card><CardHeader><KeyRound /><CardTitle>Public-key identity</CardTitle><CardDescription>{docket.trustEnvironment === "development" ? "Development evidence only. Production requires persistent environment keys." : "Production key supplied by the deployment environment."}</CardDescription></CardHeader><CardContent className="break-all font-mono text-xs">{docket.publicKeyId}</CardContent></Card></div>
          <Card className="mt-6"><CardHeader><Copy /><CardTitle>Ed25519 signature</CardTitle><CardDescription>Verify against GET /api/v1/public-key.</CardDescription></CardHeader><CardContent className="break-all font-mono text-xs leading-relaxed">{docket.signature}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
