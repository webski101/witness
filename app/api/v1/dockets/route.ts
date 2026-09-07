import { getStore } from "@/lib/witness/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, dockets: getStore().listDockets() });
}
