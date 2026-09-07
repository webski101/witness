import { bigserial, index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const dockets = pgTable("dockets", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  productName: text("product_name").notNull(),
  serviceName: text("service_name").notNull(),
  grade: text("grade").notNull(),
  priceCredits: integer("price_credits").notNull(),
  summary: text("summary").notNull(),
  json: text("json").notNull(),
});

export const artifacts = pgTable("artifacts", {
  docketId: text("docket_id").notNull(),
  path: text("path").notNull(),
  kind: text("kind").notNull(),
  json: text("json").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.docketId, table.path] })]);

export const grants = pgTable("grants", {
  id: text("id").primaryKey(),
  namespaceId: text("namespace_id").notNull(),
  subject: text("subject").notNull(),
  issuer: text("issuer").notNull(),
  docketId: text("docket_id"),
  json: text("json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("grants_scope").on(table.namespaceId, table.subject, table.issuer)]);

export const grantUsage = pgTable("grant_usage", {
  namespaceId: text("namespace_id").notNull(),
  grantId: text("grant_id").notNull(),
  uses: integer("uses").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.namespaceId, table.grantId] })]);

export const auditEvents = pgTable("audit_events", {
  seq: bigserial("seq", { mode: "number" }).primaryKey(),
  traceId: text("trace_id").notNull(),
  docketId: text("docket_id"),
  at: text("at").notNull(),
  actor: text("actor").notNull(),
  outcome: text("outcome").notNull(),
  json: text("json").notNull(),
}, (table) => [index("audit_trace").on(table.traceId, table.seq)]);

export const cloudAuditExports = pgTable("cloud_audit_exports", {
  traceId: text("trace_id").primaryKey(),
  status: text("status").notNull(),
  eventCount: integer("event_count").notNull(),
  attempts: integer("attempts").notNull().default(1),
  endpoint: text("endpoint").notNull(),
  lastError: text("last_error"),
  updatedAt: text("updated_at").notNull(),
});

export const metadata = pgTable("metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
