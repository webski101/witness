import {
  CapabilityAuthorizer,
  SharedOSKernel,
  agentExecutionCapability,
  type AccessContext,
  type Address,
  type AuditEvent,
  type Capability,
  type CapabilityGrant,
  type JsonObject,
  type JsonValue,
  type ResourceProvider,
  type ToolHandler,
} from "@aicoo/sharedos";
import { ADDRESSES, MAX_NETWORK_CALLS, NAMESPACE_ID, PURPOSE } from "@/lib/witness/constants";
import { dispatchDemoFixture, type FixtureContext } from "@/lib/witness/fixtures";
import { fetchExternalSeller, isDemoUrl } from "@/lib/witness/ssrf";
import { signPayload } from "@/lib/witness/signature";
import { getStore, type WitnessStore } from "@/lib/witness/store";
import { sha256 } from "@/lib/witness/canonical";
import type { TimelineEvent } from "@/lib/witness/types";

export const OWNER = { kind: "human", userId: "owner.witness" } as const;
export const HOST = { kind: "human", userId: "host.witness" } as const;
export const SERVICE = { kind: "service", serviceId: "witness.trial" } as const;
export const AGENTS = {
  clerk: { kind: "agent", agentId: "clerk.witness" },
  skeptic: { kind: "agent", agentId: "skeptic.witness" },
  examiner: { kind: "agent", agentId: "examiner.witness" },
  notary: { kind: "agent", agentId: "notary.witness" },
} as const;

function originResourceSegment(origin: string): string {
  const url = new URL(origin);
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  return `origin-${url.protocol.slice(0, -1)}-${url.hostname}-${port}`;
}

function artifactDocket(path: string[]): string | undefined {
  return path[0] === "dockets" && path[1]?.startsWith("wkt_") ? path[1] : undefined;
}

function resourceProvider(store: WitnessStore): ResourceProvider {
  return {
    namespace: "files",
    async invoke(operation) {
      const path = operation.resource.path;
      const docketId = artifactDocket(path);
      if (!docketId) {
        return {
          operationId: operation.operationId,
          completedAt: new Date().toISOString(),
          status: "failed",
          error: { code: "invalid_resource", message: "Witness only exposes docket resources", retryable: false },
        };
      }
      if (operation.action === "read") {
        const value = store.getArtifact(docketId, path);
        if (value === undefined) {
          return {
            operationId: operation.operationId,
            completedAt: new Date().toISOString(),
            status: "failed",
            error: { code: "not_found", message: "Docket artifact not found", retryable: false },
          };
        }
        return { operationId: operation.operationId, completedAt: new Date().toISOString(), status: "succeeded", output: value as JsonValue };
      }
      if (operation.action === "replace" || operation.action === "create") {
        store.putArtifact(docketId, path, operation.input ?? null);
        return { operationId: operation.operationId, completedAt: new Date().toISOString(), status: "succeeded", output: { stored: true } };
      }
      return {
        operationId: operation.operationId,
        completedAt: new Date().toISOString(),
        status: "failed",
        error: { code: "unsupported_action", message: "Unsupported Witness file action", retryable: false },
      };
    },
  };
}

function httpTool(store: WitnessStore): ToolHandler {
  return {
    definition: {
      name: "http.fetch",
      description: "Fetch one seller URL after exact-origin authorization and SSRF validation.",
      namespace: "http",
      source: "native",
      readWrite: "read",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          method: { enum: ["GET", "POST"] },
          body: {},
          headers: { type: "object" },
        },
        required: ["url", "method"],
        additionalProperties: false,
      },
      requiredCapability: { resource: { namespace: "http", path: [], owner: OWNER }, action: "fetch" },
      annotations: { readOnly: true },
    },
    parseArguments(arguments_) {
      const url = String(arguments_.url ?? "");
      const method = String(arguments_.method ?? "");
      if (!url || (method !== "GET" && method !== "POST")) throw new Error("invalid http.fetch arguments");
      return JSON.parse(JSON.stringify(arguments_)) as JsonObject;
    },
    resolveRequirement(_context, call) {
      const target = new URL(String(call.arguments.url));
      return { resource: { namespace: "http", path: [originResourceSegment(target.origin)], owner: OWNER }, action: "fetch" };
    },
    async invoke(context, call, signal) {
      const target = new URL(String(call.arguments.url));
      const method = String(call.arguments.method) as "GET" | "POST";
      const body = call.arguments.body;
      const headers = (call.arguments.headers ?? {}) as Record<string, string>;
      try {
        let response;
        if (isDemoUrl(target)) {
          if (target.searchParams.get("mode") === "unavailable") {
            throw new Error("Demo seller is intentionally unavailable");
          }
          const statePath = ["dockets", context.traceId, "fixture-state.json"];
          const state = (store.getArtifact(context.traceId, statePath) ?? {}) as FixtureContext;
          response = await dispatchDemoFixture(target.pathname, method, body, headers, state);
          store.putArtifact(context.traceId, statePath, state);
        } else {
          response = await fetchExternalSeller({ target, allowedOrigin: target.origin, method, body, headers, signal });
        }
        return {
          callId: call.id,
          tool: call.tool,
          completedAt: new Date().toISOString(),
          status: "succeeded",
          output: response as unknown as JsonValue,
        };
      } catch (error) {
        return {
          callId: call.id,
          tool: call.tool,
          completedAt: new Date().toISOString(),
          status: "failed",
          error: { code: "seller_fetch_failed", message: error instanceof Error ? error.message : "Seller request failed", retryable: false },
        };
      }
    },
  };
}

function signTool(store: WitnessStore): ToolHandler {
  return {
    definition: {
      name: "crypto.sign-docket",
      description: "Sign one canonical Witness docket with the configured Ed25519 key.",
      namespace: "crypto",
      source: "native",
      readWrite: "write",
      inputSchema: { type: "object", properties: { docketId: { type: "string" }, payload: { type: "object" } }, required: ["docketId", "payload"], additionalProperties: false },
      requiredCapability: { resource: { namespace: "crypto", path: ["dockets"], owner: OWNER }, action: "sign" },
      annotations: { destructive: false, idempotent: true },
    },
    parseArguments(arguments_) {
      if (typeof arguments_.docketId !== "string" || typeof arguments_.payload !== "object" || arguments_.payload === null) {
        throw new Error("invalid crypto.sign-docket arguments");
      }
      return JSON.parse(JSON.stringify(arguments_)) as JsonObject;
    },
    resolveRequirement(_context, call) {
      return { resource: { namespace: "crypto", path: ["dockets", String(call.arguments.docketId)], owner: OWNER }, action: "sign" };
    },
    async invoke(_context, call) {
      return { callId: call.id, tool: call.tool, completedAt: new Date().toISOString(), status: "succeeded", output: signPayload(call.arguments.payload, store) as unknown as JsonValue };
    },
  };
}

export function createWitnessKernel(store = getStore()): SharedOSKernel {
  const kernel = new SharedOSKernel({
    grantSource: store,
    authorizer: new CapabilityAuthorizer({ usageStore: store }),
    audit: store,
  });
  kernel.registerResourceProvider(resourceProvider(store));
  kernel.registerTool(httpTool(store));
  kernel.registerTool(signTool(store));
  return kernel;
}

function capability(path: string[], actions: string[], scope: "exact" | "descendants" = "exact"): Capability {
  return { resource: { namespace: "files", path, owner: OWNER }, actions, scope };
}

export function createDocketGrants(docketId: string, sellerOrigin: string, issuedAt = new Date().toISOString()): CapabilityGrant[] {
  const intake = ["dockets", docketId, "intake.json"];
  const probes = ["dockets", docketId, "probes.json"];
  const evidence = ["dockets", docketId, "evidence.json"];
  const verdict = ["dockets", docketId, "verdict.json"];
  const final = ["dockets", docketId, "docket.json"];
  const make = (id: string, subject: Address, capabilities: Capability[], constraints: CapabilityGrant["constraints"] = { purposes: [PURPOSE] }): CapabilityGrant => ({
    id: `${docketId}-${id}`,
    namespaceId: NAMESPACE_ID,
    subject,
    issuer: OWNER,
    capabilities,
    constraints,
    issuedAt,
    metadata: { docketId },
  });
  return [
    make("clerk", AGENTS.clerk, [capability(intake, ["read", "replace"]), agentExecutionCapability(SERVICE, OWNER)]),
    make("skeptic", AGENTS.skeptic, [capability(intake, ["read"]), capability(probes, ["read", "replace"])]),
    make("examiner-files", AGENTS.examiner, [capability(intake, ["read"]), capability(probes, ["read"]), capability(evidence, ["read", "replace"])]),
    make("examiner-http", AGENTS.examiner, [{ resource: { namespace: "http", path: [originResourceSegment(sellerOrigin)], owner: OWNER }, actions: ["fetch"], scope: "exact" }], { purposes: [PURPOSE], maxUses: MAX_NETWORK_CALLS }),
    make("notary-files", AGENTS.notary, [capability(intake, ["read"]), capability(probes, ["read"]), capability(evidence, ["read"]), capability(verdict, ["read", "replace"]), capability(final, ["read", "replace"])]),
    make("notary-sign", AGENTS.notary, [{ resource: { namespace: "crypto", path: ["dockets", docketId], owner: OWNER }, actions: ["sign"], scope: "exact" }]),
  ];
}

export function contextFor(actor: Address, docketId: string): AccessContext {
  return {
    namespaceId: NAMESPACE_ID,
    actor,
    authority: OWNER,
    owner: OWNER,
    purpose: PURPOSE,
    traceId: docketId,
    enabledToolNamespaces: ["files", "http", "crypto"],
    now: new Date().toISOString(),
  };
}

export function docketAuthorityId(grants: CapabilityGrant[]): string {
  return `app:sha256:${sha256({ purpose: PURPOSE, grants })}`;
}

function addressString(address: Address): string {
  if (address.kind === "agent") return `agent:${address.agentId}`;
  if (address.kind === "human") return `human:${address.userId}`;
  if (address.kind === "service") return `service:${address.serviceId}`;
  return `group:${address.conversationId}`;
}

function decision(outcome: AuditEvent["outcome"]): TimelineEvent["decision"] {
  if (outcome === "denied") return "DENIED";
  if (outcome === "failed") return "FAILED";
  if (outcome === "escalated") return "ESCALATED";
  return "ALLOWED";
}

export function timelineFromAudit(events: AuditEvent[]): TimelineEvent[] {
  return events.map((event, index) => ({
    seq: index + 1,
    ts: event.at,
    actor: addressString(event.actor),
    action: event.tool ?? event.action ?? event.type,
    resource: event.resource ? `${event.resource.namespace}:${event.resource.path.join("/")}` : event.type,
    decision: decision(event.outcome),
    reason: event.reason ?? (event.outcome === "succeeded" ? "executed" : event.outcome),
    ...(event.grantId ? { grantId: event.grantId } : {}),
    authorityId: event.authorityHash ? `sharedos:authority:${event.authorityHash}` : "sharedos:authority:unavailable",
    ...(event.resource?.path[0] === "origin-https-evil.example-443"
      ? { note: "Actual forbidden attempt: https://evil.example/steal" }
      : typeof event.metadata?.cause === "string"
        ? { note: event.metadata.cause }
        : {}),
  }));
}

export const AGENT_ADDRESSES = ADDRESSES;
