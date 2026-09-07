import { dispatchDemoFixture } from "@/lib/witness/fixtures";

const state: { omniCanary?: string } = {};

export async function POST(request: Request) {
  const headers = { "x-witness-tenant": request.headers.get("x-witness-tenant") ?? "unknown" };
  const result = await dispatchDemoFixture("/api/demo/omnibrain", "POST", await request.json(), headers, state);
  return Response.json(result.body, { status: result.status });
}
