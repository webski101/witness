import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, Coins, RadioTower } from "lucide-react";

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
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Agent-facing contract</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Call once. Know before you buy.</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            POST one seller endpoint and its claims. Receive real execution evidence, exact verdicts, the authorization trail, and an Ed25519 signature.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-background p-5">
            <Coins className="text-accent" />
            <p className="mt-6 font-mono text-2xl font-semibold">8 / 15</p>
            <p className="text-sm text-muted-foreground">credits</p>
          </div>
          <div className="bg-background p-5">
            <Clock3 className="text-accent" />
            <p className="mt-6 font-mono text-2xl font-semibold">&lt;20s</p>
            <p className="text-sm text-muted-foreground">typical</p>
          </div>
        </div>
      </div>

      <section className="console-panel mt-12 overflow-hidden">
        <div className="border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-2 text-accent">
            <RadioTower className="size-4" />
            <h2 className="font-semibold tracking-[-0.03em]">MCP /api/mcp</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Remote Streamable HTTP · tools: probe (8 credits), docket (15 credits)</p>
        </div>
        <div className="px-5 py-4 text-sm text-muted-foreground">
          Connect an MCP client to <span className="font-mono text-foreground">https://witness-swart.vercel.app/api/mcp</span>, discover the two tools, and call one with the request fields below. No account or human setup is required.
        </div>
      </section>

      <section className="console-panel mt-5 overflow-hidden">
        <div className="border-b border-border/80 px-5 py-4">
          <h2 className="font-semibold tracking-[-0.03em]">REST POST /api/v1/trial</h2>
          <p className="mt-1 text-sm text-muted-foreground">Content-Type: application/json</p>
        </div>
        <pre className="overflow-x-auto bg-background/50 p-5 font-mono text-xs leading-relaxed text-foreground/85">{requestBody}</pre>
      </section>

      <section className="console-panel mt-5 overflow-hidden">
        <div className="border-b border-border/80 px-5 py-4">
          <h2 className="font-semibold tracking-[-0.03em]">Response</h2>
          <p className="mt-1 text-sm text-muted-foreground">One verdict per claim. No omitted or guessed status.</p>
        </div>
        <pre className="overflow-x-auto bg-background/50 p-5 font-mono text-xs leading-relaxed text-foreground/85">{responseBody}</pre>
      </section>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ["/api/v1/listing", "Service listing", "Machine-readable contract"],
          ["/.well-known/agent.json", "Agent card", "Discovery path"],
          ["/api/v1/public-key", "Verification key", "Ed25519 public key"],
        ].map(([href, title, copy]) => (
          <Link key={href} href={href} className="group console-panel p-5 transition-colors hover:border-accent/40">
            <strong className="tracking-[-0.02em]">{title}</strong>
            <span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              {copy} <ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
