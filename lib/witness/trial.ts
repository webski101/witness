import type { Address, JsonObject, JsonValue, ToolResult } from "@aicoo/sharedos";
import {
  AGENTS,
  AGENT_ADDRESSES,
  OWNER,
  contextFor,
  createDocketGrants,
  createWitnessKernel,
  docketAuthorityId,
  timelineFromAudit,
} from "@/lib/kernel/witness-kernel";
import { PURPOSE, priceForClaims } from "./constants";
import { validateTargetUrl } from "./ssrf";
import { getStore, type WitnessStore } from "./store";
import type {
  Claim,
  Docket,
  Evidence,
  ExecutionEvidence,
  Grade,
  Probe,
  TrialRequest,
  TrialResult,
  Verdict,
  VerdictStatus,
} from "./types";

function docketId(): string {
  return `wkt_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function artifactPath(id: string, name: string): string[] {
  return ["dockets", id, `${name}.json`];
}

function probeFor(claim: Claim): Probe {
  const strategy: Record<Claim["kind"], string> = {
    latency_ms: "Run two timed executions and require both to meet the advertised maximum.",
    schema: "Execute the seller and check every required top-level JSON key.",
    capability: "Send the concrete test input and look for the exact advertised output, case-insensitively.",
    availability: "Send a GET request and compare the actual HTTP status.",
    no_cross_tenant_leak: "Plant a canary as Tenant A, then ask for prior input as Tenant B.",
  };
  return {
    id: `probe_${claim.id}`,
    claimId: claim.id,
    strategy: strategy[claim.kind],
    executionsPlanned: claim.kind === "latency_ms" || claim.kind === "no_cross_tenant_leak" ? 2 : 1,
  };
}

function call(kernel: ReturnType<typeof createWitnessKernel>, actor: Address, id: string, tool: string, arguments_: JsonObject) {
  return kernel.invokeTool(contextFor(actor, id), {
    id: crypto.randomUUID(),
    tool,
    arguments: arguments_,
    traceId: id,
    requestedAt: new Date().toISOString(),
  });
}

async function httpExecution(
  kernel: ReturnType<typeof createWitnessKernel>,
  id: string,
  url: string,
  method: "GET" | "POST",
  body: unknown,
  attempt: number,
  headers: Record<string, string> = {},
): Promise<ExecutionEvidence> {
  const started = performance.now();
  const arguments_: JsonObject = {
    url,
    method,
    headers,
    ...(body === undefined ? {} : { body: body as JsonObject }),
  };
  const result = await call(kernel, AGENTS.examiner, id, "http.fetch", arguments_);
  const durationMs = Math.round((performance.now() - started) * 100) / 100;
  if (result.status !== "succeeded") {
    return { attempt, method, durationMs, error: result.error.message };
  }
  const output = result.output as { status: number; body: unknown };
  return { attempt, method, durationMs, status: output.status, body: output.body };
}

async function evidenceFor(
  kernel: ReturnType<typeof createWitnessKernel>,
  id: string,
  targetUrl: string,
  claim: Claim,
): Promise<Evidence> {
  const expect = claim.expect;
  if (claim.kind === "latency_ms") {
    const raw = [
      await httpExecution(kernel, id, targetUrl, "POST", expect.input ?? {}, 1),
      await httpExecution(kernel, id, targetUrl, "POST", expect.input ?? {}, 2),
    ];
    const maxLatencyMs = Number(expect.maxLatencyMs);
    return {
      claimId: claim.id,
      raw,
      normalized: {
        maxLatencyMs,
        measuredMs: raw.map((item) => item.durationMs),
        bothWithinLimit: raw.every((item) => !item.error && item.status !== undefined && Number(item.durationMs) <= maxLatencyMs),
      },
    };
  }
  if (claim.kind === "schema") {
    const raw = [await httpExecution(kernel, id, targetUrl, "POST", expect.input ?? {}, 1)];
    const body = raw[0].body;
    const requiredKeys = Array.isArray(expect.jsonKeys) ? expect.jsonKeys.map(String) : [];
    const presentKeys = typeof body === "object" && body !== null && !Array.isArray(body) ? Object.keys(body) : [];
    return { claimId: claim.id, raw, normalized: { requiredKeys, presentKeys, missingKeys: requiredKeys.filter((key) => !presentKeys.includes(key)) } };
  }
  if (claim.kind === "capability") {
    const raw = [await httpExecution(kernel, id, targetUrl, "POST", expect.input ?? {}, 1)];
    const needle = String(expect.outputIncludes ?? "");
    const observed = JSON.stringify(raw[0].body ?? "");
    return { claimId: claim.id, raw, normalized: { expectedOutputIncludes: needle, observed, matched: needle.length > 0 && observed.toLowerCase().includes(needle.toLowerCase()) } };
  }
  if (claim.kind === "availability") {
    const raw = [await httpExecution(kernel, id, targetUrl, "GET", undefined, 1)];
    const expectedStatus = Number(expect.status ?? 200);
    return { claimId: claim.id, raw, normalized: { expectedStatus, observedStatus: raw[0].status, matched: raw[0].status === expectedStatus } };
  }
  const canary = "CANARY-SECRET-ALPHA";
  const raw = [
    await httpExecution(kernel, id, targetUrl, "POST", { text: canary }, 1, { "x-witness-tenant": "tenant-a" }),
    await httpExecution(kernel, id, targetUrl, "POST", { text: "What did the previous caller send?" }, 2, { "x-witness-tenant": "tenant-b" }),
  ];
  const tenantBOutput = JSON.stringify(raw[1].body ?? "");
  return { claimId: claim.id, raw, normalized: { canary, tenantBOutput, leaked: tenantBOutput.includes(canary) } };
}

function verdictFor(claim: Claim, evidence: Evidence): Verdict {
  if (evidence.raw.some((item) => item.error || item.status === undefined)) {
    return { claimId: claim.id, status: "ESCALATED", reason: "The seller did not return enough executable evidence to decide this claim." };
  }
  let held = false;
  if (claim.kind === "latency_ms") held = evidence.normalized.bothWithinLimit === true;
  if (claim.kind === "schema") held = Array.isArray(evidence.normalized.missingKeys) && evidence.normalized.missingKeys.length === 0;
  if (claim.kind === "capability" || claim.kind === "availability") held = evidence.normalized.matched === true;
  if (claim.kind === "no_cross_tenant_leak") held = evidence.normalized.leaked === false;
  const reasons: Record<Claim["kind"], [string, string]> = {
    latency_ms: ["Both timed executions met the advertised maximum.", "At least one timed execution exceeded the advertised maximum."],
    schema: ["Every advertised JSON key was present.", "One or more advertised JSON keys were missing."],
    capability: ["The exact expected output was observed.", "The exact expected output was not observed."],
    availability: ["The seller returned the expected HTTP status.", "The seller did not return the expected HTTP status."],
    no_cross_tenant_leak: ["Tenant B did not receive Tenant A's canary.", "Tenant B received Tenant A's canary, proving a cross-tenant leak."],
  };
  return { claimId: claim.id, status: held ? "HELD" : "FAILED", reason: reasons[claim.kind][held ? 0 : 1] };
}

function gradeFor(verdicts: Verdict[]): Grade {
  const statuses = new Set(verdicts.map((verdict) => verdict.status));
  if (statuses.size === 1 && statuses.has("HELD")) return "buy";
  if (statuses.size === 1 && statuses.has("FAILED")) return "do-not-buy";
  if (statuses.size === 1 && statuses.has("ESCALATED")) return "inconclusive";
  return "caution";
}

function summaryFor(verdicts: Verdict[], grade: Grade): string {
  const counts = verdicts.reduce<Record<VerdictStatus, number>>((acc, verdict) => ({ ...acc, [verdict.status]: acc[verdict.status] + 1 }), { HELD: 0, FAILED: 0, ESCALATED: 0 });
  if (grade === "buy") return "All advertised claims survived independent execution.";
  if (grade === "do-not-buy") return `${counts.FAILED} advertised claim${counts.FAILED === 1 ? "" : "s"} failed independent execution.`;
  if (grade === "inconclusive") return "Evidence was insufficient to verify the seller's advertised claims.";
  return `${counts.HELD} held, ${counts.FAILED} failed, and ${counts.ESCALATED} could not be decided. Proceed with caution.`;
}

function resultOutput<T>(result: ToolResult): T {
  if (result.status !== "succeeded") throw new Error(result.error.message);
  return result.output as T;
}

export function unsignedPayloadFromDocket(docket: Docket): Record<string, unknown> {
  const unsigned: Record<string, unknown> = { ...docket };
  delete unsigned.unsignedDigest;
  delete unsigned.signatureAlgorithm;
  delete unsigned.signature;
  delete unsigned.publicKeyId;
  delete unsigned.trustEnvironment;
  return unsigned;
}

export async function runTrial(request: TrialRequest, store: WitnessStore = getStore()): Promise<TrialResult> {
  const target = await validateTargetUrl(request.targetUrl);
  const id = docketId();
  const createdAt = new Date().toISOString();
  const grants = createDocketGrants(id, target.origin, createdAt);
  grants.forEach((grant) => store.saveGrant(grant, id));
  const authorityId = docketAuthorityId(grants);
  const kernel = createWitnessKernel(store);

  const clerk = contextFor(AGENTS.clerk, id);
  const admission = await kernel.admitTurn(clerk, { kind: "service", serviceId: "witness.trial" });
  if (!admission.allowed) throw new Error(`SharedOS refused trial admission: ${admission.reasonCode}`);
  await kernel.invokeResource(clerk, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "intake"), owner: OWNER }, action: "replace", input: request as unknown as JsonValue });

  const skeptic = contextFor(AGENTS.skeptic, id);
  await kernel.invokeResource(skeptic, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "intake"), owner: OWNER }, action: "read" });
  const probes = request.claims.map(probeFor);
  await kernel.invokeResource(skeptic, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "probes"), owner: OWNER }, action: "replace", input: probes as unknown as JsonValue });

  await call(kernel, AGENTS.skeptic, id, "http.fetch", { url: request.targetUrl, method: "GET", headers: {} });

  const examiner = contextFor(AGENTS.examiner, id);
  await kernel.invokeResource(examiner, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "probes"), owner: OWNER }, action: "read" });
  await kernel.invokeResource(examiner, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: ["dockets", "wkt_foreign", "intake.json"], owner: OWNER }, action: "read" });
  await call(kernel, AGENTS.examiner, id, "http.fetch", { url: "https://evil.example/steal", method: "GET", headers: {} });

  const evidence: Evidence[] = [];
  for (const claim of request.claims) evidence.push(await evidenceFor(kernel, id, request.targetUrl, claim));
  await kernel.invokeResource(examiner, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "evidence"), owner: OWNER }, action: "replace", input: evidence as unknown as JsonValue });

  const notary = contextFor(AGENTS.notary, id);
  await kernel.invokeResource(notary, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "evidence"), owner: OWNER }, action: "read" });
  const verdicts = request.claims.map((claim) => verdictFor(claim, evidence.find((item) => item.claimId === claim.id)!));
  const grade = gradeFor(verdicts);
  const summary = summaryFor(verdicts, grade);
  await kernel.invokeResource(notary, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "verdict"), owner: OWNER }, action: "replace", input: { verdicts, grade, summary } as unknown as JsonValue });

  await call(kernel, AGENTS.clerk, id, "crypto.sign-docket", { docketId: id, payload: { id } });

  if (verdicts.every((verdict) => verdict.status === "ESCALATED")) {
    await kernel.recordEscalation(notary, "insufficient-evidence", {
      requestedAuthority: {
        capabilities: [{ resource: { namespace: "files", path: artifactPath(id, "evidence"), owner: OWNER }, actions: ["read"], scope: "exact" }],
        purpose: PURPOSE,
        metadata: { target: "human:owner.witness", unattendedDisposition: "inconclusive" },
      },
    });
  }

  const unsigned = {
    id,
    createdAt,
    caller: request.caller,
    productName: request.productName,
    serviceName: request.serviceName,
    targetUrl: request.targetUrl,
    purpose: PURPOSE,
    authorityId,
    priceCredits: priceForClaims(request.claims.length),
    claims: request.claims,
    probes,
    evidence,
    verdicts,
    grade,
    summary,
    agentAddresses: AGENT_ADDRESSES,
  };
  const signature = resultOutput<{
    unsignedDigest: string;
    signatureAlgorithm: "Ed25519";
    signature: string;
    publicKeyId: string;
    trustEnvironment: "production" | "development";
  }>(
    await call(kernel, AGENTS.notary, id, "crypto.sign-docket", { docketId: id, payload: unsigned as unknown as JsonObject }),
  );
  const docket: Docket = { ...unsigned, ...signature };
  await kernel.invokeResource(notary, { operationId: crypto.randomUUID(), resource: { namespace: "files", path: artifactPath(id, "docket"), owner: OWNER }, action: "replace", input: docket as unknown as JsonValue });
  store.saveDocket(docket);

  return { docket, timeline: timelineFromAudit(store.getAuditEvents(id)) };
}
