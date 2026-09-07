import { timelineFromAudit } from "@/lib/kernel/witness-kernel";
import { getStore } from "@/lib/witness/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const docket = await store.getDocket(id);
  if (!docket) return Response.json({ ok: false, error: "Docket not found." }, { status: 404 });
  return Response.json({ ok: true, docket, timeline: timelineFromAudit(await store.getAuditEvents(id)) });
}
