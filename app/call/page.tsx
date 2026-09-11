import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, Coins, RadioTower } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Call Witness" };

const requestBody = `{
  "caller": "agent:buyer.sharednet",
  "productName": "OmniBrain XL",
  "serviceName": "universal-reason",
  "targetUrl": "https://seller.example/service",
  "claims": [{
    "id": "lat",
    "kind": "latency_ms",
    "statement": "Responds in under 50ms.",
    "expect": { "maxLatencyMs": 50, "input": { "text": "hello" } }
  }]
}`;

const responseBody = `{
  "ok": true,
  "priceCredits": 8,
  "docket": {
    "id": "wkt_...",
    "grade": "buy | caution | do-not-buy | inconclusive",
    "verdicts": [{ "claimId": "lat", "status": "HELD" }],
    "signatureAlgorithm": "Ed25519"
  },
  "timeline": []
}`;

export default function CallPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">Agent-facing contract</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Call once. Know before you buy.</h1><p className="mt-4 max-w-2xl text-lg text-muted-foreground">POST one seller endpoint and its claims. Receive real execution evidence, exact verdicts, the authorization trail, and an Ed25519 signature.</p></div><div className="grid grid-cols-2 gap-px border bg-border"><div className="bg-background p-5"><Coins /><p className="mt-6 font-mono text-2xl font-semibold">8 / 15</p><p className="text-sm text-muted-foreground">credits</p></div><div className="bg-background p-5"><Clock3 /><p className="mt-6 font-mono text-2xl font-semibold">&lt;20s</p><p className="text-sm text-muted-foreground">typical</p></div></div></div>
      <Card className="mt-12"><CardHeader><RadioTower /><CardTitle>MCP /api/mcp</CardTitle><CardDescription>Remote Streamable HTTP · tools: probe (8 credits), docket (15 credits)</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Connect an MCP client to <span className="font-mono text-foreground">https://witness-swart.vercel.app/api/mcp</span>, discover the two tools, and call one with the request fields below. No account or human setup is required.</p></CardContent></Card>
      <Card className="mt-6"><CardHeader><RadioTower /><CardTitle>REST POST /api/v1/trial</CardTitle><CardDescription>Content-Type: application/json</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto border bg-muted/45 p-5 font-mono text-xs leading-relaxed">{requestBody}</pre></CardContent></Card>
      <Card className="mt-6"><CardHeader><CardTitle>Response</CardTitle><CardDescription>One verdict per claim. No omitted or guessed status.</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto border bg-muted/45 p-5 font-mono text-xs leading-relaxed">{responseBody}</pre></CardContent></Card>
      <div className="mt-8 grid gap-4 md:grid-cols-3"><Link href="/api/v1/listing" className="group border p-5"><strong>Service listing</strong><span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">Machine-readable contract <ArrowUpRight className="transition-transform group-hover:translate-x-1" /></span></Link><Link href="/.well-known/agent.json" className="group border p-5"><strong>Agent card</strong><span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">Discovery path <ArrowUpRight className="transition-transform group-hover:translate-x-1" /></span></Link><Link href="/api/v1/public-key" className="group border p-5"><strong>Verification key</strong><span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">Ed25519 public key <ArrowUpRight className="transition-transform group-hover:translate-x-1" /></span></Link></div>
    </main>
  );
}
