export const PURPOSE =
  "Independent trial of another agent's advertised service. Produce a signed docket of what held, what failed, and what could not be decided. Never guess. Escalate when evidence is insufficient. One tenant's intake is never readable by another caller.";

export const ADDRESSES = {
  clerk: "agent:clerk.witness",
  skeptic: "agent:skeptic.witness",
  examiner: "agent:examiner.witness",
  notary: "agent:notary.witness",
  host: "human:host.witness",
  owner: "human:owner.witness",
  service: "service:witness.trial",
} as const;

export const NAMESPACE_ID = "witness";
export const MAX_NETWORK_CALLS = 24;
export const NETWORK_TIMEOUT_MS = 6_000;
export const MAX_RESPONSE_BYTES = 1_048_576;
export const MAX_REDIRECTS = 3;

export function priceForClaims(count: number): 8 | 15 {
  return count === 1 ? 8 : 15;
}
