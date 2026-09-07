import { getStore } from "@/lib/witness/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const docketId = new URL(request.url).searchParams.get("docketId") ?? undefined;
  return Response.json({ ok: true, denyByDefault: true, docketId: docketId ?? null, grants: await getStore().listGrants(docketId) });
}
