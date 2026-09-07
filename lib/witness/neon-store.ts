import { attachDatabasePool } from "@vercel/functions";
import { Pool, type QueryResultRow } from "pg";
import type {
  AuditEvent,
  CapabilityGrant,
  GrantSource,
} from "@aicoo/sharedos";
import type { CloudAuditExport } from "./sharedos-cloud";
import type { WitnessStorePort } from "./store-port";
import type { Docket, StoredDocketSummary } from "./types";

function addressKey(address: { kind: string } & Record<string, unknown>): string {
  if (address.kind === "agent") return `agent:${String(address.agentId)}`;
  if (address.kind === "human") return `human:${String(address.userId)}`;
  if (address.kind === "service") return `service:${String(address.serviceId)}`;
  return `group:${String(address.conversationId)}`;
}

function parseJson<T>(value: unknown): T {
  return JSON.parse(String(value)) as T;
}

export class NeonWitnessStore implements WitnessStorePort {
  readonly persistenceKind = "neon-postgres" as const;
  private readonly pool: Pool;
  private readyPromise?: Promise<void>;
  private readonly authorityByTraceActor = new Map<string, string>();
  private readonly pendingAudit = new Map<string, Array<{
    traceId: string;
    docketId: string | null;
    at: string;
    actor: string;
    outcome: string;
    json: string;
  }>>();

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("DATABASE_URL is required for Neon persistence");
    this.pool = new Pool({ connectionString, max: 10 });
    attachDatabasePool(this.pool);
  }

  initialize(): Promise<void> {
    this.readyPromise ??= this.pool.query("SELECT 1").then(() => undefined);
    return this.readyPromise;
  }

  private async query<Row extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<Row[]> {
    return (await this.pool.query<Row>(text, values)).rows;
  }

  async saveGrant(grant: CapabilityGrant, docketId?: string): Promise<void> {
    await this.initialize();
    await this.query(
      `INSERT INTO grants(id, namespace_id, subject, issuer, docket_id, json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET json = EXCLUDED.json`,
      [grant.id, grant.namespaceId, addressKey(grant.subject), addressKey(grant.issuer), docketId ?? null, JSON.stringify(grant), grant.issuedAt],
    );
  }

  async listGrants(docketId?: string): Promise<CapabilityGrant[]> {
    await this.initialize();
    const rows = await this.query<{ json: string }>(
      docketId
        ? "SELECT json FROM grants WHERE docket_id = $1 ORDER BY id"
        : "SELECT json FROM grants ORDER BY created_at DESC, id",
      docketId ? [docketId] : [],
    );
    return rows.map((row) => parseJson<CapabilityGrant>(row.json));
  }

  async load(context: Parameters<GrantSource["load"]>[0]): Promise<readonly CapabilityGrant[]> {
    await this.initialize();
    const scoped = context.traceId.startsWith("wkt_");
    const rows = await this.query<{ json: string }>(
      scoped
        ? "SELECT json FROM grants WHERE namespace_id = $1 AND subject = $2 AND issuer = $3 AND docket_id = $4 ORDER BY id"
        : "SELECT json FROM grants WHERE namespace_id = $1 AND subject = $2 AND issuer = $3 ORDER BY id",
      scoped
        ? [context.namespaceId, addressKey(context.actor), addressKey(context.authority), context.traceId]
        : [context.namespaceId, addressKey(context.actor), addressKey(context.authority)],
    );
    return rows.map((row) => parseJson<CapabilityGrant>(row.json));
  }

  async getUsage(namespaceId: string, grantId: string): Promise<number> {
    await this.initialize();
    const rows = await this.query<{ uses: number }>(
      "SELECT uses FROM grant_usage WHERE namespace_id = $1 AND grant_id = $2",
      [namespaceId, grantId],
    );
    return Number(rows[0]?.uses ?? 0);
  }

  async tryConsume(namespaceId: string, grantId: string, maximumUses: number): Promise<boolean> {
    await this.initialize();
    const rows = await this.query<{ uses: number }>(
      `INSERT INTO grant_usage(namespace_id, grant_id, uses) VALUES ($1, $2, 1)
       ON CONFLICT(namespace_id, grant_id) DO UPDATE SET uses = grant_usage.uses + 1
       WHERE grant_usage.uses < $3 RETURNING uses`,
      [namespaceId, grantId, maximumUses],
    );
    return rows.length === 1;
  }

  async record(event: AuditEvent): Promise<void> {
    const authorityKey = `${event.traceId}|${addressKey(event.actor)}`;
    if (event.authorityHash) this.authorityByTraceActor.set(authorityKey, event.authorityHash);
    const authorityHash = event.authorityHash ?? this.authorityByTraceActor.get(authorityKey);
    const recorded = authorityHash ? { ...event, authorityHash } : event;
    const pending = this.pendingAudit.get(recorded.traceId) ?? [];
    pending.push({
      traceId: recorded.traceId,
      docketId: recorded.traceId.startsWith("wkt_") ? recorded.traceId : null,
      at: recorded.at,
      actor: addressKey(recorded.actor),
      outcome: recorded.outcome,
      json: JSON.stringify(recorded),
    });
    this.pendingAudit.set(recorded.traceId, pending);
  }

  async flushAuditEvents(traceId?: string): Promise<void> {
    await this.initialize();
    const traceIds = traceId ? [traceId] : [...this.pendingAudit.keys()];
    for (const id of traceIds) {
      const rows = this.pendingAudit.get(id);
      if (!rows?.length) continue;
      this.pendingAudit.delete(id);
      const values: unknown[] = [];
      const placeholders = rows.map((row, index) => {
        values.push(row.traceId, row.docketId, row.at, row.actor, row.outcome, row.json);
        const offset = index * 6;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      });
      try {
        await this.query(
          `INSERT INTO audit_events(trace_id, docket_id, at, actor, outcome, json) VALUES ${placeholders.join(", ")}`,
          values,
        );
      } catch (error) {
        this.pendingAudit.set(id, [...rows, ...(this.pendingAudit.get(id) ?? [])]);
        throw error;
      }
    }
  }

  async getAuditEvents(traceId?: string): Promise<AuditEvent[]> {
    await this.flushAuditEvents(traceId);
    const rows = await this.query<{ json: string }>(
      traceId
        ? "SELECT json FROM audit_events WHERE trace_id = $1 ORDER BY seq"
        : "SELECT json FROM audit_events ORDER BY seq DESC LIMIT 500",
      traceId ? [traceId] : [],
    );
    return rows.map((row) => parseJson<AuditEvent>(row.json));
  }

  async saveCloudAuditExport(traceId: string, result: CloudAuditExport): Promise<void> {
    await this.initialize();
    await this.query(
      `INSERT INTO cloud_audit_exports(trace_id, status, event_count, attempts, endpoint, last_error, updated_at)
       VALUES ($1, $2, $3, 1, $4, $5, $6)
       ON CONFLICT(trace_id) DO UPDATE SET status = EXCLUDED.status, event_count = EXCLUDED.event_count,
       attempts = cloud_audit_exports.attempts + 1, endpoint = EXCLUDED.endpoint,
       last_error = EXCLUDED.last_error, updated_at = EXCLUDED.updated_at`,
      [traceId, result.status, result.eventCount, result.endpoint, result.error ?? null, new Date().toISOString()],
    );
  }

  async getCloudAuditExport(traceId: string): Promise<Record<string, unknown> | undefined> {
    await this.initialize();
    const rows = await this.query<Record<string, unknown>>(
      `SELECT trace_id AS "traceId", status, event_count AS "eventCount", attempts,
              endpoint, last_error AS "lastError", updated_at AS "updatedAt"
       FROM cloud_audit_exports WHERE trace_id = $1`,
      [traceId],
    );
    return rows[0];
  }

  async putArtifact(docketId: string, path: string[], value: unknown): Promise<void> {
    await this.initialize();
    const pathString = path.join("/");
    const kind = path.at(-1)?.replace(".json", "") ?? "artifact";
    await this.query(
      `INSERT INTO artifacts(docket_id, path, kind, json, updated_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(docket_id, path) DO UPDATE SET json = EXCLUDED.json, updated_at = EXCLUDED.updated_at`,
      [docketId, pathString, kind, JSON.stringify(value), new Date().toISOString()],
    );
  }

  async getArtifact(docketId: string, path: string[]): Promise<unknown | undefined> {
    await this.initialize();
    const rows = await this.query<{ json: string }>(
      "SELECT json FROM artifacts WHERE docket_id = $1 AND path = $2",
      [docketId, path.join("/")],
    );
    return rows[0] ? parseJson(rows[0].json) : undefined;
  }

  async saveDocket(docket: Docket): Promise<void> {
    await this.initialize();
    await this.query(
      `INSERT INTO dockets(id, created_at, product_name, service_name, grade, price_credits, summary, json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET grade = EXCLUDED.grade, summary = EXCLUDED.summary, json = EXCLUDED.json`,
      [docket.id, docket.createdAt, docket.productName, docket.serviceName, docket.grade, docket.priceCredits, docket.summary, JSON.stringify(docket)],
    );
  }

  async getDocket(id: string): Promise<Docket | undefined> {
    await this.initialize();
    const rows = await this.query<{ json: string }>("SELECT json FROM dockets WHERE id = $1", [id]);
    return rows[0] ? parseJson<Docket>(rows[0].json) : undefined;
  }

  async listDockets(): Promise<StoredDocketSummary[]> {
    await this.initialize();
    return await this.query<StoredDocketSummary>(
      `SELECT id, created_at AS "createdAt", product_name AS "productName",
              service_name AS "serviceName", grade, price_credits AS "priceCredits", summary
       FROM dockets ORDER BY created_at DESC LIMIT 100`,
    );
  }

  async getMetadata(key: string): Promise<string | undefined> {
    await this.initialize();
    const rows = await this.query<{ value: string }>("SELECT value FROM metadata WHERE key = $1", [key]);
    return rows[0]?.value;
  }

  async setMetadata(key: string, value: string): Promise<void> {
    await this.initialize();
    await this.query(
      "INSERT INTO metadata(key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value",
      [key, value],
    );
  }
}
