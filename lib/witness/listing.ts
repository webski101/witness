import { ADDRESSES, PURPOSE } from "./constants";

export const listing = {
  name: "Witness",
  tagline: "Before you buy the agent, put its claims on trial.",
  shortDescription:
    "Witness - test before you buy. Send a seller endpoint and its advertised claims. Witness executes independent probes and returns a signed evidence docket showing what HELD, FAILED or could not be proven. Probe one claim for 8 credits or run a full docket for 15. Typical response <20 seconds.",
  purpose: PURPOSE,
  sla: { maximum: "5 minutes", typical: "under 20 seconds" },
  call: { method: "POST", path: "/api/v1/trial", contentType: "application/json" },
  services: [
    { name: "probe", priceCredits: 8, claims: "exactly 1" },
    { name: "docket", priceCredits: 15, claims: "2 or more" },
  ],
  supportedClaimKinds: ["latency_ms", "schema", "capability", "availability", "no_cross_tenant_leak"],
  inputSchema: {
    type: "object",
    required: ["productName", "serviceName", "targetUrl", "claims"],
    properties: {
      caller: { type: "string", default: "agent:anonymous.arena" },
      productName: { type: "string" },
      serviceName: { type: "string" },
      targetUrl: { type: "string", format: "uri", protocols: ["http", "https"] },
      claims: {
        type: "array",
        minItems: 1,
        items: { type: "object", required: ["id", "kind", "statement", "expect"] },
      },
    },
  },
  outputSchema: {
    type: "object",
    required: ["ok", "priceCredits", "docket", "timeline"],
    verdictEnum: ["HELD", "FAILED", "ESCALATED"],
    gradeEnum: ["buy", "do-not-buy", "caution", "inconclusive"],
  },
  discovery: "/.well-known/agent.json",
  publicKey: "/api/v1/public-key",
  agentIdentities: ADDRESSES,
  runtime: {
    local: "Official @aicoo/sharedos embedded kernel",
    arena: "SharedOS Cloud execution is a deployment eligibility gate and requires preview provisioning",
  },
} as const;
