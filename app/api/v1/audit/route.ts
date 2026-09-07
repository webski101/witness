import { timelineFromAudit } from "@/lib/kernel/witness-kernel";
import { getStore } from "@/lib/witness/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const docketId = new URL(request.url).searchParams.get("docketId") ?? undefined;
  const store = getStore();
  const events = await store.getAuditEvents(docketId);
  const cloud = docketId ? (await store.getCloudAuditExport(docketId)) ?? null : null;
  return Response.json({ ok: true, docketId: docketId ?? null, cloud, timeline: timelineFromAudit(events), raw: events });
}
