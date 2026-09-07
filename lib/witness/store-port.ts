import type {
  AuditEvent,
  AuditSink,
  CapabilityGrant,
  GrantSource,
  GrantUsageStore,
} from "@aicoo/sharedos";
import type { CloudAuditExport } from "./sharedos-cloud";
import type { Docket, StoredDocketSummary } from "./types";

export type Awaitable<T> = T | Promise<T>;

export interface WitnessStorePort extends GrantSource, GrantUsageStore, AuditSink {
  readonly persistenceKind: "sqlite" | "neon-postgres";
  saveGrant(grant: CapabilityGrant, docketId?: string): Awaitable<void>;
  listGrants(docketId?: string): Awaitable<CapabilityGrant[]>;
  flushAuditEvents(traceId?: string): Awaitable<void>;
  getAuditEvents(traceId?: string): Awaitable<AuditEvent[]>;
  saveCloudAuditExport(traceId: string, result: CloudAuditExport): Awaitable<void>;
  getCloudAuditExport(traceId: string): Awaitable<Record<string, unknown> | undefined>;
  putArtifact(docketId: string, path: string[], value: unknown): Awaitable<void>;
  getArtifact(docketId: string, path: string[]): Awaitable<unknown | undefined>;
  saveDocket(docket: Docket): Awaitable<void>;
  getDocket(id: string): Awaitable<Docket | undefined>;
  listDockets(): Awaitable<StoredDocketSummary[]>;
  getMetadata(key: string): Awaitable<string | undefined>;
  setMetadata(key: string, value: string): Awaitable<void>;
}
