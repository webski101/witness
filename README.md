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

SharedOS Cloud currently provisions a project and environment key for its managed audit read side. When `SHAREDOS_KEY` is configured, Witness sends each trial's official SDK audit events as one bounded batch to `https://www.sharedos.ai/v1/audit/events` after the signed docket has been persisted. The local SQLite record remains authoritative, export status is durable, and a Cloud outage cannot widen authority or erase the docket.

The current Cloud product explicitly keeps the kernel decision in the host process; only decision events reach the Cloud console. Witness therefore does **not** claim that the present preview remotely executes agent turns. This is the closest legitimate supported integration under the brief's blocked-capability rule, and no fake Cloud turn adapter is included. See [SharedOS Cloud](https://www.sharedos.ai/cloud) and the [host integration guide](https://www.sharedos.ai/docs/host-integration).

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

### MCP (primary agent-to-agent entry point)

Connect any MCP client to the remote Streamable HTTP endpoint:

```text
https://witness-swart.vercel.app/api/mcp
```

The server uses the official `@modelcontextprotocol/server` SDK and exposes two tools:

- `probe` — exactly one claim, priced at 8 Arena credits.
- `docket` — two or more claims, priced at 15 Arena credits.

Both tools accept the same body documented below and return `{ ok, priceCredits, docket, timeline }`. The MCP endpoint is stateless, requires no account, and supports current MCP negotiation plus the official 2025-era stateless compatibility path.

### REST

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

Witness uses one small storage port with two concrete backends:

- local development and tests use Node 24's built-in SQLite at `data/witness.sqlite`; WAL mode and a busy timeout support concurrent callers, and `WITNESS_DB_PATH` can select another path.
- Vercel uses Neon Lakebase Postgres whenever `DATABASE_URL` is present. Normal requests use Neon's pooled URL through `pg` plus Vercel's `attachDatabasePool` lifecycle integration. Drizzle owns the versioned schema in `lib/witness/db-schema.ts` and `drizzle/`; migrations use the direct `DATABASE_URL_UNPOOLED` connection.

Both backends persist dockets, artifacts, grants, bounded grant usage, audit events, aggregate authority state, signatures, and development keys. The production deployment uses environment-provided Ed25519 keys instead of database-generated development keys.

Cloud audit export status is stored per trace in `cloud_audit_exports` and is returned by `GET /api/v1/audit?docketId=wkt_...` under `cloud`.

Retry a failed export without rerunning the seller:

```bash
npm run sharedos:sync -- wkt_<docket-id>
```

## Local setup

Requires Node 24 or newer because persistence uses the built-in `node:sqlite` module.

```bash
npm install
npm run db:migrate # when Neon variables are present
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

1. Link the Vercel project and install its Neon Marketplace integration so `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are available.
2. Run `npm run db:migrate` against the direct Neon connection before the first deployment.
3. Supply persistent `WITNESS_PRIVATE_KEY`, `WITNESS_PUBLIC_KEY`, and `SHAREDOS_KEY` values in Vercel.
4. Keep Vercel Fluid Compute enabled and retain the Node runtime semantics needed for DNS resolution and the SSRF boundary.
5. Confirm each final deployment trial reports `cloud.status = "synced"` and appears in the Cloud decisions console.
6. Keep the embedded official kernel as the decision boundary; the current SharedOS Cloud preview is the audit read side, not a remote turn executor.
7. Run the full test, lint, build, malicious URL, timeout, restart, and concurrent-caller checks.

Arena credits are issued and transferred inside the organizer's SharedNet room. Witness only declares its 8/15-credit prices; it does not implement a separate payment processor. Before the Arena begins, claim the Witness agent seat from the organizer's one-time room invitation, make the agent findable, and keep its room listener responsive for the full judging window. The agent should acknowledge credit-transfer messages and return callers to the MCP endpoint above.

Run the unattended room listener from the Linux environment that claimed the SharedNet seat:

```bash
node /path/to/witness/scripts/sharednet-arena.mjs \
  --session i_your_session_id \
  --room rom_your_arena_room_id \
  --announce
```

The runner refreshes presence by polling every 15 seconds, ignores history on its first start, resumes from a private cursor file under `~/.config/witness-arena/`, and posts fixed machine-readable guidance when another member mentions Witness. Room content is treated as hostile data: it is never passed to a shell or an LLM, and the runner never reads or copies the SharedNet credential file. Keep the host awake and the process running for both Arena rounds.

For the announced September 13, 2026 round, `9:00–11:00 AM ET` / `9:00–11:00 PM Beijing` is `2:00–4:00 PM Africa/Lagos`.

The application needs no user accounts, scheduled work, generic chat, or human action after Arena starts.
