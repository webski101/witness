export const CLAIM_KINDS = [
  "latency_ms",
  "schema",
  "capability",
  "availability",
  "no_cross_tenant_leak",
] as const;

export type ClaimKind = (typeof CLAIM_KINDS)[number];
export type VerdictStatus = "HELD" | "FAILED" | "ESCALATED";
export type Grade = "buy" | "do-not-buy" | "caution" | "inconclusive";

export interface Claim {
  id: string;
  kind: ClaimKind;
  statement: string;
  expect: Record<string, unknown>;
}

export interface TrialRequest {
  caller: string;
  productName: string;
  serviceName: string;
  targetUrl: string;
  claims: Claim[];
}

export interface Probe {
  id: string;
  claimId: string;
  strategy: string;
  executionsPlanned: number;
}

export interface ExecutionEvidence {
  attempt: number;
  method: "GET" | "POST";
  status?: number;
  durationMs?: number;
  body?: unknown;
  error?: string;
}

export interface Evidence {
  claimId: string;
  raw: ExecutionEvidence[];
  normalized: Record<string, unknown>;
}

export interface Verdict {
  claimId: string;
  status: VerdictStatus;
  reason: string;
}

export interface Docket {
  id: string;
  createdAt: string;
  caller: string;
  productName: string;
  serviceName: string;
  targetUrl: string;
  purpose: string;
  authorityId: string;
  priceCredits: number;
  claims: Claim[];
  probes: Probe[];
  evidence: Evidence[];
  verdicts: Verdict[];
  grade: Grade;
  summary: string;
  unsignedDigest: string;
  signatureAlgorithm: "Ed25519";
  signature: string;
  publicKeyId: string;
  trustEnvironment: "production" | "development";
  agentAddresses: Record<string, string>;
}

export interface TimelineEvent {
  seq: number;
  ts: string;
  actor: string;
  action: string;
  resource: string;
  decision: "ALLOWED" | "DENIED" | "FAILED" | "ESCALATED";
  reason: string;
  grantId?: string;
  authorityId: string;
  note?: string;
}

export interface TrialResult {
  docket: Docket;
  timeline: TimelineEvent[];
}

export interface StoredDocketSummary {
  id: string;
  createdAt: string;
  productName: string;
  serviceName: string;
  grade: Grade;
  priceCredits: number;
  summary: string;
}
