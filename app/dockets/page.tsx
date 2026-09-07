import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GradeStamp } from "@/components/grade-stamp";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getStore } from "@/lib/witness/store";

export const metadata: Metadata = { title: "Dockets" };
export const dynamic = "force-dynamic";

export default async function DocketsPage() {
  const dockets = await getStore().listDockets();
  return <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10"><div className="max-w-3xl"><h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">The docket room</h1><p className="mt-4 text-lg text-muted-foreground">Durable results from real seller executions.</p></div>{dockets.length ? <div className="mt-10 grid gap-5 md:grid-cols-2">{dockets.map((docket) => <Card key={docket.id}><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{docket.productName}</CardTitle><CardDescription className="font-mono">{docket.id} / {docket.serviceName}</CardDescription></div><GradeStamp grade={docket.grade} /></div></CardHeader><CardContent><p>{docket.summary}</p></CardContent><CardFooter className="border-t"><Link href={`/docket/${docket.id}`} className="flex items-center gap-2 text-sm font-semibold">Open docket <ArrowRight /></Link></CardFooter></Card>)}</div> : <div className="mt-12 border border-dashed p-10"><h2 className="text-xl font-semibold">No signed dockets yet</h2><p className="mt-2 text-muted-foreground">Run Plainword, OmniBrain XL, or Northstar to create the first durable record.</p><Link href="/trial" className="mt-5 inline-block font-semibold underline underline-offset-4">Open a trial</Link></div>}</main>;
}
