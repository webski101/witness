import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  AuditEvent,
  AuditSink,
  CapabilityGrant,
  GrantSource,
  GrantUsageStore,
} from "@aicoo/sharedos";
import type { Docket, StoredDocketSummary } from "./types";
import type { CloudAuditExport } from "./sharedos-cloud";

function addressKey(address: { kind: string } & Record<string, unknown>): string {
  if (address.kind === "agent") return `agent:${String(address.agentId)}`;
  if (address.kind === "human") return `human:${String(address.userId)}`;
  if (address.kind === "service") return `service:${String(address.serviceId)}`;
  return `group:${String(address.conversationId)}`;
}

export class WitnessStore implements GrantSource, GrantUsageStore, AuditSink {
  readonly db: DatabaseSync;
  private readonly authorityByTraceActor = new Map<string, string>();

  constructor(path = process.env.WITNESS_DB_PATH ?? join(process.cwd(), "data", "witness.sqlite")) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dockets (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        product_name TEXT NOT NULL,
        service_name TEXT NOT NULL,
        grade TEXT NOT NULL,
        price_credits INTEGER NOT NULL,
        summary TEXT NOT NULL,
        json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS artifacts (
        docket_id TEXT NOT NULL,
        path TEXT NOT NULL,
        kind TEXT NOT NULL,
        json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (docket_id, path)
      );
      CREATE TABLE IF NOT EXISTS grants (
        id TEXT PRIMARY KEY,
        namespace_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        issuer TEXT NOT NULL,
        docket_id TEXT,
        json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS grants_scope ON grants(namespace_id, subject, issuer);
      CREATE TABLE IF NOT EXISTS grant_usage (
        namespace_id TEXT NOT NULL,
        grant_id TEXT NOT NULL,
        uses INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(namespace_id, grant_id)
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        trace_id TEXT NOT NULL,
        docket_id TEXT,
        at TEXT NOT NULL,
        actor TEXT NOT NULL,
        outcome TEXT NOT NULL,
        json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS audit_trace ON audit_events(trace_id, seq);
      CREATE TABLE IF NOT EXISTS cloud_audit_exports (
        trace_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        event_count INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 1,
        endpoint TEXT NOT NULL,
        last_error TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  close(): void {
    this.db.close();
  }

  clearAll(): void {
    this.db.exec("DELETE FROM cloud_audit_exports; DELETE FROM audit_events; DELETE FROM grant_usage; DELETE FROM grants; DELETE FROM artifacts; DELETE FROM dockets;");
  }

  saveGrant(grant: CapabilityGrant, docketId?: string): void {
    this.db.prepare(`
      INSERT INTO grants(id, namespace_id, subject, issuer, docket_id, json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET json = excluded.json
    `).run(
      grant.id,
      grant.namespaceId,
      addressKey(grant.subject),
      addressKey(grant.issuer),
      docketId ?? null,
      JSON.stringify(grant),
      grant.issuedAt,
    );
  }

  listGrants(docketId?: string): CapabilityGrant[] {
    const rows = docketId
      ? this.db.prepare("SELECT json FROM grants WHERE docket_id = ? ORDER BY id").all(docketId)
      : this.db.prepare("SELECT json FROM grants ORDER BY created_at DESC, id").all();
    return rows.map((row) => JSON.parse(String((row as Record<string, unknown>).json)) as CapabilityGrant);
  }

  async load(context: Parameters<GrantSource["load"]>[0]): Promise<readonly CapabilityGrant[]> {
    const rows = context.traceId.startsWith("wkt_")
      ? this.db.prepare(
          "SELECT json FROM grants WHERE namespace_id = ? AND subject = ? AND issuer = ? AND docket_id = ? ORDER BY id",
        ).all(context.namespaceId, addressKey(context.actor), addressKey(context.authority), context.traceId)
      : this.db.prepare(
          "SELECT json FROM grants WHERE namespace_id = ? AND subject = ? AND issuer = ? ORDER BY id",
        ).all(context.namespaceId, addressKey(context.actor), addressKey(context.authority));
    return rows.map((row) => JSON.parse(String((row as Record<string, unknown>).json)) as CapabilityGrant);
  }

  async getUsage(namespaceId: string, grantId: string): Promise<number> {
    const row = this.db.prepare(
      "SELECT uses FROM grant_usage WHERE namespace_id = ? AND grant_id = ?",
    ).get(namespaceId, grantId) as { uses?: number } | undefined;
    return row?.uses ?? 0;
  }

  async tryConsume(namespaceId: string, grantId: string, maximumUses: number): Promise<boolean> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = await this.getUsage(namespaceId, grantId);
      if (current >= maximumUses) {
        this.db.exec("ROLLBACK");
        return false;
      }
      this.db.prepare(`
        INSERT INTO grant_usage(namespace_id, grant_id, uses) VALUES (?, ?, 1)
        ON CONFLICT(namespace_id, grant_id) DO UPDATE SET uses = uses + 1
      `).run(namespaceId, grantId);
      this.db.exec("COMMIT");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async record(event: AuditEvent): Promise<void> {
    const authorityKey = `${event.traceId}|${addressKey(event.actor)}`;
    if (event.authorityHash) this.authorityByTraceActor.set(authorityKey, event.authorityHash);
    const authorityHash = event.authorityHash ?? this.authorityByTraceActor.get(authorityKey);
    const recorded = authorityHash ? { ...event, authorityHash } : event;
    this.db.prepare(`
      INSERT INTO audit_events(trace_id, docket_id, at, actor, outcome, json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      recorded.traceId,
      recorded.traceId.startsWith("wkt_") ? recorded.traceId : null,
      recorded.at,
      addressKey(recorded.actor),
      recorded.outcome,
      JSON.stringify(recorded),
    );
  }

  getAuditEvents(traceId?: string): AuditEvent[] {
    const rows = traceId
      ? this.db.prepare("SELECT json FROM audit_events WHERE trace_id = ? ORDER BY seq").all(traceId)
      : this.db.prepare("SELECT json FROM audit_events ORDER BY seq DESC LIMIT 500").all();
    return rows.map((row) => JSON.parse(String((row as Record<string, unknown>).json)) as AuditEvent);
  }

  saveCloudAuditExport(traceId: string, result: CloudAuditExport): void {
    this.db.prepare(`
      INSERT INTO cloud_audit_exports(trace_id, status, event_count, attempts, endpoint, last_error, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(trace_id) DO UPDATE SET
        status = excluded.status,
        event_count = excluded.event_count,
        attempts = cloud_audit_exports.attempts + 1,
        endpoint = excluded.endpoint,
        last_error = excluded.last_error,
        updated_at = excluded.updated_at
    `).run(
      traceId,
      result.status,
      result.eventCount,
      result.endpoint,
      result.error ?? null,
      new Date().toISOString(),
    );
  }

  getCloudAuditExport(traceId: string): Record<string, unknown> | undefined {
    return this.db.prepare(`
      SELECT trace_id AS traceId, status, event_count AS eventCount, attempts,
             endpoint, last_error AS lastError, updated_at AS updatedAt
      FROM cloud_audit_exports WHERE trace_id = ?
    `).get(traceId) as Record<string, unknown> | undefined;
  }

  putArtifact(docketId: string, path: string[], value: unknown): void {
    const pathString = path.join("/");
    const kind = path.at(-1)?.replace(".json", "") ?? "artifact";
    this.db.prepare(`
      INSERT INTO artifacts(docket_id, path, kind, json, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(docket_id, path) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
    `).run(docketId, pathString, kind, JSON.stringify(value), new Date().toISOString());
  }

  getArtifact(docketId: string, path: string[]): unknown | undefined {
    const row = this.db.prepare(
      "SELECT json FROM artifacts WHERE docket_id = ? AND path = ?",
    ).get(docketId, path.join("/")) as { json?: string } | undefined;
    return row?.json ? JSON.parse(row.json) : undefined;
  }

  saveDocket(docket: Docket): void {
    this.db.prepare(`
      INSERT INTO dockets(id, created_at, product_name, service_name, grade, price_credits, summary, json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET grade = excluded.grade, summary = excluded.summary, json = excluded.json
    `).run(
      docket.id,
      docket.createdAt,
      docket.productName,
      docket.serviceName,
      docket.grade,
      docket.priceCredits,
      docket.summary,
      JSON.stringify(docket),
    );
  }

  getDocket(id: string): Docket | undefined {
    const row = this.db.prepare("SELECT json FROM dockets WHERE id = ?").get(id) as
      | { json?: string }
      | undefined;
    return row?.json ? (JSON.parse(row.json) as Docket) : undefined;
  }

  listDockets(): StoredDocketSummary[] {
    return this.db.prepare(`
      SELECT id, created_at AS createdAt, product_name AS productName,
             service_name AS serviceName, grade, price_credits AS priceCredits, summary
      FROM dockets ORDER BY created_at DESC LIMIT 100
    `).all() as unknown as StoredDocketSummary[];
  }

  getMetadata(key: string): string | undefined {
    const row = this.db.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as
      | { value?: string }
      | undefined;
    return row?.value;
  }

  setMetadata(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO metadata(key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }
}

const globalStore = globalThis as typeof globalThis & { witnessStore?: WitnessStore };

export function getStore(): WitnessStore {
  globalStore.witnessStore ??= new WitnessStore();
  return globalStore.witnessStore;
}
