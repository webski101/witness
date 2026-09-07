import { dispatchDemoFixture } from "@/lib/witness/fixtures";

export async function GET() {
  const result = await dispatchDemoFixture("/api/demo/northstar", "GET", undefined, {}, {});
  return Response.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const result = await dispatchDemoFixture("/api/demo/northstar", "POST", await request.json(), {}, {});
  return Response.json(result.body, { status: result.status });
}
