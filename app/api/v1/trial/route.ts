import { TrialRequestSchema } from "@/lib/witness/validation";
import { runTrial } from "@/lib/witness/trial";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = TrialRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid trial request.", issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = await runTrial(parsed.data);
    return Response.json({ ok: true, priceCredits: result.docket.priceCredits, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trial execution failed.";
    const invalidTarget = /targetUrl|blocked|localhost|absolute URL|http or https|credentials|resolves/u.test(message);
    return Response.json({ ok: false, error: message }, { status: invalidTarget ? 400 : 422 });
  }
}
