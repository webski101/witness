import { dispatchDemoFixture } from "@/lib/witness/fixtures";

export async function POST(request: Request) {
  const result = await dispatchDemoFixture("/api/demo/plainword", "POST", await request.json(), {}, {});
  return Response.json(result.body, { status: result.status });
}
