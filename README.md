# Witness

**Before you buy the agent, put its claims on trial.**

Witness is a SharedOS-native live due-diligence bureau for Arena agents. A buyer supplies a seller endpoint and advertised claims. Witness attempts to falsify them through real executions, captures evidence, assigns exactly one verdict per claim (`HELD`, `FAILED`, or `ESCALATED`), and returns an Ed25519-signed docket plus its authorization timeline.

The buying case is simple: spend 8 credits to test one promise before risking a larger purchase. Two or more claims cost 15 credits. A normal deterministic docket completes in under 20 seconds; the hard SLA is 5 minutes.

## The loop

`CLAIM -> PROBE -> REAL EXECUTION -> EVIDENCE -> VERDICT -> SIGNED DOCKET`

Witness supports only the initial claim set: `latency_ms`, `schema`, `capability`, `availability`, and `no_cross_tenant_leak`.

## SharedOS architecture

Witness pins the official [`@aicoo/sharedos`](https://www.npmjs.com/package/@aicoo/sharedos) package at `0.1.0-alpha.4`. It does not contain a substitute policy engine.

The local and test runtime uses the official embedded kernel:

- `SharedOSKernel` receives a trusted SQLite-backed `GrantSource`.
- `CapabilityAuthorizer` makes deny-by-default decisions.
- the SQLite store implements atomic `GrantUsageStore.tryConsume` for the 24-call Examiner limit.
- the docket artifact provider is registered as the `files` resource plane.
- seller execution is the registered `http.fetch` tool.
- Ed25519 signing is the registered `crypto.sign-docket` tool.
- exact resource or tool calls are re-authorized immediately before invocation.
- `kernel.admitTurn` consumes the Clerk-to-service invocation capability.
- the official audit sink contract persists authority resolution, authorization, resource, tool, escalation, and turn outcomes.

The host enriches SDK outcome records that omit `authorityHash` with the immediately preceding official `authority.resolved` hash for the same trace and actor. This makes every returned timeline entry point at the authority state used for its decision without changing the decision.

Official references: [SharedOS quickstart](https://www.sharedos.ai/docs/quickstart), [host integration guide](https://www.sharedos.ai/docs/host-integration), [permission model](https://www.sharedos.ai/docs/security/permission-model).

### Real Cloud versus local development

The open-source embedded kernel, grant decisions, bounded uses, exact-call checks, escalation records, and audit events are real SharedOS in local development.

SharedOS Cloud is currently a design-partner preview and does not publish a general self-service deployment API or credentials flow. This repository therefore does **not** claim local turns are Cloud-hosted. Arena eligibility still requires SharedOS to provision the preview environment and the final deployment to move the bounded turns to that managed boundary. The policy, tool, resource, grant, and audit contracts here are already the official portable contracts; the Cloud transport must be wired from the provisioning details SharedOS supplies. Production deployment should fail its eligibility review until that provisioning is complete. See [SharedOS Cloud](https://www.sharedos.ai/cloud).

This is the real platform limitation called out by the brief's blocked-capability rule. No fake Cloud adapter is included.

## Identities and grant map

Purpose:

> Independent trial of another agent's advertised service. Produce a signed docket of what held, what failed, and what could not be decided. Never guess. Escalate when evidence is insufficient. One tenant's intake is never readable by another caller.

| Identity | May | Cannot |
| --- | --- | --- |
| `agent:clerk.witness` | invoke `service:witness.trial`; read/write its intake | HTTP, signatures, foreign dockets |
| `agent:skeptic.witness` | read intake; read/write probes | HTTP, signatures, foreign dockets |
| `agent:examiner.witness` | read intake/probes; read/write evidence; exact seller-origin HTTP, max 24 | other origins, signatures, foreign dockets |
| `agent:notary.witness` | read trial artifacts; write verdict/final docket; docket-scoped signing | seller HTTP or fabricated conclusions |
| `human:host.witness` | host control identity | no application workflow grant |
| `human:owner.witness` | grant issuer and escalation reviewer | not required during unattended trials |
| `service:witness.trial` | addressed trial service | no ambient filesystem or network authority |

Every docket gets new grants scoped to `dockets/{docketId}/...`. The store loads only the grants whose `docket_id` matches the current trusted trace. Old grants for the same actor cannot enter a later docket's authority set.

The official SDK produces an `authorityHash` for each actor's resolved grant set. Timeline entries expose these as `sharedos:authority:<hash>`. A docket spans several actor-specific sets, so its single aggregate `authorityId` is explicitly application-level: `app:sha256:<digest>` over canonical purpose plus all docket grants.

## Required denial demonstrations

Every trial performs actual forbidden operations through the kernel:

1. Skeptic calls `http.fetch` and is denied.
2. Examiner reads `dockets/wkt_foreign/intake.json` and is denied.
3. Examiner calls `https://evil.example/steal` and is denied before network execution.
4. Clerk invokes `crypto.sign-docket` and is denied.
5. If all claims lack evidence, Notary calls `recordEscalation("insufficient-evidence")`.

The UI timeline is a projection of persisted SharedOS audit events, not seeded presentation data.

## Escalation

`ESCALATED` means the service did not produce enough executable evidence to decide. If every claim is escalated, the Notary records an official escalation targeted by host metadata to `human:owner.witness`. The running trial does not gain new authority. During unattended Arena operation it completes safely with an `inconclusive` docket whose signature attests the lack of evidence.

## SSRF controls

Custom targets accept only absolute HTTP/HTTPS URLs without embedded credentials. Witness resolves the hostname before grant creation, blocks localhost, private, carrier-grade NAT, link-local, multicast, reserved, and metadata-address space, validates each redirect, refuses origin changes, caps redirects at 3, response bodies at 1 MiB, request time at 6 seconds, and allowed calls at 24. Loopback is accepted only for the three exact local demo paths on port 43147. Failures close safely.

## API

Call `POST /api/v1/trial`:

```json
{
  "caller": "agent:buyer.sharednet",
  "productName": "OmniBrain XL",
  "serviceName": "universal-reason",
  "targetUrl": "https://seller.example/service",
  "claims": [{
    "id": "lat",
    "kind": "latency_ms",
    "statement": "Responds in under 50ms.",
    "expect": { "maxLatencyMs": 50, "input": { "text": "hello" } }
  }]
}
```

One claim costs 8 credits. Two or more cost 15. Omit `caller` to use `agent:anonymous.arena`.

Discovery and inspection:

- `GET /api/v1/listing`
- `GET /.well-known/agent.json`
- `GET /api/v1/dockets`
- `GET /api/v1/dockets/:id`
- `GET /api/v1/audit?docketId=wkt_...`
- `GET /api/v1/grants?docketId=wkt_...`
- `GET /api/v1/public-key`

## Signature verification

Witness signs the canonical JSON representation of the unsigned docket with Ed25519. `unsignedDigest` is SHA-256 over those same canonical bytes. Remove `unsignedDigest`, `signatureAlgorithm`, `signature`, `publicKeyId`, and `trustEnvironment` before canonicalizing the returned docket for verification.

Production must provide persistent keys as PEM strings or base64 DER:

```bash
WITNESS_PRIVATE_KEY=...
WITNESS_PUBLIC_KEY=...
```

When they are absent, Witness generates a development keypair and persists it in SQLite. The docket and public-key endpoint mark it `development`; it is never labeled production evidence.

## Persistence

Node 24's built-in SQLite stores dockets, artifacts, grants, bounded grant usage, audit events, aggregate authority state, signatures, and development keys at `data/witness.sqlite`. WAL mode and a busy timeout support concurrent local callers. Set `WITNESS_DB_PATH` to choose another durable path.

## Local setup

Requires Node 24 or newer because persistence uses the built-in `node:sqlite` module.

```bash
npm install
npm run sharedos:proof
npm test
npm run lint
npm run build
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

The three deterministic local sellers are dispatched in-process by the trial engine, so the Next.js server never fetches itself:

- Plainword: `buy`, all claims held.
- OmniBrain XL: `do-not-buy`, including a detected Tenant A canary leak to Tenant B.
- Northstar: `caution`, Paris held and boiling point failed.

## Production and Arena deployment

1. Provision a durable writable SQLite volume or replace the small `WitnessStore` port with the deployment's supported persistent store.
2. supply persistent Ed25519 keys.
3. retain Node runtime semantics for DNS resolution and the SSRF boundary.
4. provision SharedOS Cloud preview access with the platform team.
5. bind the official Cloud transport to the same trusted grant source, tools, resources, purpose, identities, and audit sink.
6. confirm the final deployment's required agent turns appear in Cloud audit before declaring Arena eligibility.
7. run the full test, lint, build, malicious URL, timeout, restart, and concurrent-caller checks.

The application needs no user accounts, scheduled work, generic chat, or human action after Arena starts.
