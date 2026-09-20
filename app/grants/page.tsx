import type { Metadata } from "next";
import { ChevronRight, CircleSlash2, FileKey2, Globe2, PenTool } from "lucide-react";

export const metadata: Metadata = { title: "Grant map" };

const roles = [
  {
    name: "Clerk",
    address: "agent:clerk.witness",
    icon: FileKey2,
    may: "Invoke the trial service; read and write this docket's intake.",
    cannot: "HTTP fetch, sign verdicts, or read another docket.",
  },
  {
    name: "Skeptic",
    address: "agent:skeptic.witness",
    icon: CircleSlash2,
    may: "Read this intake; read and write this docket's probes.",
    cannot: "HTTP fetch, sign verdicts, or read another tenant.",
  },
  {
    name: "Examiner",
    address: "agent:examiner.witness",
    icon: Globe2,
    may: "Read intake and probes; write evidence; fetch the exact seller origin up to 24 times.",
    cannot: "Other origins, foreign dockets, or signatures.",
  },
  {
    name: "Notary",
    address: "agent:notary.witness",
    icon: PenTool,
    may: "Read trial artifacts; write verdict and final docket; invoke the docket-scoped signer.",
    cannot: "Fetch sellers or fabricate a conclusion when evidence is absent.",
  },
];

export default function GrantsPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="max-w-3xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Authority map</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Authority passes by role, not convenience.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Deny by default. Every active grant is scoped to one docket, one purpose, one actor, one owner, and explicit actions.
        </p>
      </div>
      <div className="mt-12 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {roles.map((role, index) => (
          <div key={role.name} className="contents">
            <article className="console-panel flex flex-col overflow-hidden">
              <div className="border-b border-border/80 px-5 py-4">
                <role.icon className="text-accent" />
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em]">{role.name}</h2>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{role.address}</p>
              </div>
              <div className="flex flex-col gap-5 px-5 py-5">
                <div>
                  <p className="font-mono text-[11px] font-semibold text-accent">MAY</p>
                  <p className="mt-1 text-sm leading-relaxed">{role.may}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold text-destructive">CANNOT</p>
                  <p className="mt-1 text-sm leading-relaxed">{role.cannot}</p>
                </div>
              </div>
            </article>
            {index < roles.length - 1 ? <ChevronRight className="hidden self-center text-muted-foreground lg:block" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
      <section className="mt-12 grid gap-6 border-y border-border/80 py-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">Official decision boundary</h2>
          <p className="mt-2 text-muted-foreground">
            The embedded <code className="font-mono text-accent">@aicoo/sharedos</code> kernel resolves trusted grants, filters tools, re-authorizes exact calls, consumes bounded uses, and emits the audit stream.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">Escalation without a night shift</h2>
          <p className="mt-2 text-muted-foreground">
            When every claim lacks evidence, Notary records <code className="font-mono text-accent">insufficient-evidence</code> to{" "}
            <code className="font-mono text-accent">human:owner.witness</code>. The unattended result is safely signed as inconclusive.
          </p>
        </div>
      </section>
    </main>
  );
}
