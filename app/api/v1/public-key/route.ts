import { getPublicKeyDescription } from "@/lib/witness/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getPublicKeyDescription());
}
