"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { GradeStamp } from "@/components/grade-stamp";
import type { DemoSeller } from "@/lib/witness/demos";
import type { TrialResult } from "@/lib/witness/types";
import { cn } from "@/lib/utils";

const processSteps = ["CLAIM RECEIVED", "GRANTS SCOPED", "SKEPTIC CHALLENGE", "EXAMINER EXECUTION", "EVIDENCE CAPTURED", "NOTARY VERDICT", "SIGNED"];

export function TrialConsole({ demos }: { demos: DemoSeller[] }) {
  const [pending, setPending] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrialResult | null>(null);
  const [productName, setProductName] = useState("Seller product");
  const [serviceName, setServiceName] = useState("service-name");
  const [targetUrl, setTargetUrl] = useState("https://seller.example/service");
  const [claimsJson, setClaimsJson] = useState(JSON.stringify([{ id: "available", kind: "availability", statement: "The service is available.", expect: { status: 200 } }], null, 2));

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setActiveStep((step) => Math.min(step + 1, processSteps.length - 2)), 420);
    return () => window.clearInterval(timer);
  }, [pending]);

  const deniedCount = useMemo(() => result?.timeline.filter((event) => event.decision === "DENIED").length ?? 0, [result]);

  async function execute(payload: Record<string, unknown>) {
    setPending(true);
    setError("");
    setResult(null);
    setActiveStep(0);
    try {
      const response = await fetch("/api/v1/trial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Trial failed.");
      setActiveStep(processSteps.length - 1);
      setResult({ docket: body.docket, timeline: body.timeline });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Trial failed.");
    } finally {
      setPending(false);
    }
  }

  async function runCustom() {
    try {
      const claims = JSON.parse(claimsJson);
      await execute({ caller: "agent:anonymous.arena", productName, serviceName, targetUrl, claims });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Claims JSON is invalid.");
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
      <Card className="paper-shadow">
        <CardHeader><CardTitle className="text-2xl">Put a seller on trial</CardTitle><CardDescription>No account. No manual setup. A demo docket usually returns in under two seconds.</CardDescription></CardHeader>
        <CardContent>
          <Tabs defaultValue="fixtures">
            <TabsList variant="line"><TabsTrigger value="fixtures">Demo sellers</TabsTrigger><TabsTrigger value="custom">Custom endpoint</TabsTrigger></TabsList>
            <TabsContent value="fixtures" className="mt-6">
              <div className="flex flex-col gap-3">
                {demos.map((demo) => <button key={demo.id} type="button" disabled={pending} onClick={() => execute({ caller: "agent:arena-demo.sharednet", productName: demo.productName, serviceName: demo.serviceName, targetUrl: demo.targetUrl, claims: demo.claims })} className="group grid w-full grid-cols-[1fr_auto] items-center gap-4 border p-4 text-left transition-colors hover:bg-muted/60 disabled:opacity-50"><span><strong className="block text-base">{demo.productName}</strong><span className="mt-1 block font-mono text-xs text-muted-foreground">{demo.serviceName} / expected {demo.expectedGrade}</span></span><ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></button>)}
              </div>
            </TabsContent>
            <TabsContent value="custom" className="mt-6">
              <FieldGroup>
                <Field><FieldLabel htmlFor="product">Product name</FieldLabel><Input id="product" value={productName} onChange={(event) => setProductName(event.target.value)} /></Field>
                <Field><FieldLabel htmlFor="service">Service name</FieldLabel><Input id="service" value={serviceName} onChange={(event) => setServiceName(event.target.value)} /></Field>
                <Field><FieldLabel htmlFor="target">Callable endpoint</FieldLabel><Input id="target" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} /><FieldDescription>HTTP or HTTPS only. Private, local, link-local, and metadata addresses are blocked.</FieldDescription></Field>
                <Field><FieldLabel htmlFor="claims">Claims JSON</FieldLabel><Textarea id="claims" className="min-h-64 font-mono text-xs" value={claimsJson} onChange={(event) => setClaimsJson(event.target.value)} /><FieldDescription>One claim costs 8 credits. Two or more cost 15.</FieldDescription></Field>
                <Button size="lg" disabled={pending} onClick={runCustom}>{pending ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}Run independent trial</Button>
              </FieldGroup>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t font-mono text-xs text-muted-foreground">SLA maximum: 5 minutes / network calls capped at 24 per docket</CardFooter>
      </Card>

      <div className="flex flex-col gap-6">
        <section className="border bg-card p-5" aria-live="polite">
          <h2 className="font-semibold">Live process</h2>
          <div className="mt-5 flex flex-col gap-0">
            {processSteps.map((step, index) => <div key={step} className="grid grid-cols-[22px_1fr] gap-3"><div className="flex flex-col items-center"><span className={cn("mt-0.5 flex size-4 items-center justify-center border", index < activeStep || (result && index === activeStep) ? "border-foreground bg-foreground text-background" : index === activeStep && pending ? "process-active border-accent bg-accent text-accent-foreground" : "border-border")}>{index < activeStep || (result && index === activeStep) ? <Check className="size-3" /> : null}</span>{index < processSteps.length - 1 ? <span className="h-8 w-px bg-border" /> : null}</div><span className={cn("font-mono text-xs", index <= activeStep ? "text-foreground" : "text-muted-foreground")}>{step}</span></div>)}
          </div>
        </section>

        {error ? <Alert variant="destructive"><CircleAlert /><AlertTitle>Trial could not run</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {result ? <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{result.docket.productName}</CardTitle><CardDescription>{result.docket.summary}</CardDescription></div><GradeStamp grade={result.docket.grade} /></div></CardHeader><CardContent className="font-mono text-xs text-muted-foreground"><p>{result.docket.verdicts.length} claims / {deniedCount} real denials / {result.docket.priceCredits} credits</p><p className="mt-2 truncate">{result.docket.unsignedDigest}</p></CardContent><CardFooter><Link href={`/docket/${result.docket.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Read signed docket <ArrowRight data-icon="inline-end" /></Link></CardFooter></Card> : null}
      </div>
    </div>
  );
}
