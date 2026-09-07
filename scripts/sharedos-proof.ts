import {
  CapabilityAuthorizer,
  SharedOSKernel,
  type AccessContext,
  type AuditEvent,
  type AuditSink,
  type CapabilityGrant,
  type GrantSource,
  type ResourceProvider,
} from "@aicoo/sharedos";

const owner = { kind: "human", userId: "owner.witness" } as const;
const clerk = { kind: "agent", agentId: "clerk.witness" } as const;
const purpose = "Independent trial of another agent's advertised service.";
const now = new Date().toISOString();

const grant: CapabilityGrant = {
  id: "proof-clerk-intake",
  namespaceId: "witness",
  subject: clerk,
  issuer: owner,
  capabilities: [
    {
      resource: {
        namespace: "files",
        path: ["dockets", "wkt_proof", "intake.json"],
        owner,
      },
      actions: ["read", "replace"],
      scope: "exact",
    },
  ],
  constraints: { purposes: [purpose] },
  issuedAt: now,
};

const grantSource: GrantSource = {
  async load() {
    return [grant];
  },
};

const events: AuditEvent[] = [];
const audit: AuditSink = {
  async record(event) {
    events.push(event);
  },
};

const files: ResourceProvider = {
  namespace: "files",
  async invoke(operation) {
    return {
      operationId: operation.operationId,
      completedAt: new Date().toISOString(),
      status: "succeeded",
      output: { path: operation.resource.path, action: operation.action },
    };
  },
};

const kernel = new SharedOSKernel({
  grantSource,
  authorizer: new CapabilityAuthorizer(),
  audit,
});
kernel.registerResourceProvider(files);

const context: AccessContext = {
  namespaceId: "witness",
  actor: clerk,
  authority: owner,
  owner,
  purpose,
  traceId: crypto.randomUUID(),
  enabledToolNamespaces: ["files"],
  now,
};

async function main() {
  const allowed = await kernel.invokeResource(context, {
    operationId: crypto.randomUUID(),
    resource: {
      namespace: "files",
      path: ["dockets", "wkt_proof", "intake.json"],
      owner,
    },
    action: "replace",
    input: { productName: "Proof seller" },
  });

  const denied = await kernel.invokeResource(context, {
    operationId: crypto.randomUUID(),
    resource: {
      namespace: "files",
      path: ["dockets", "wkt_foreign", "intake.json"],
      owner,
    },
    action: "read",
  });

  if (allowed.status !== "succeeded" || denied.status !== "denied") {
    throw new Error(`SharedOS proof failed: allowed=${allowed.status}, denied=${denied.status}`);
  }

  console.log(
    JSON.stringify(
      {
        sdk: "@aicoo/sharedos@0.1.0-alpha.4",
        allowed: allowed.status,
        denied: denied.status,
        deniedCode: denied.error.code,
        authorityHashes: [
          ...new Set(events.map((event) => event.authorityHash).filter(Boolean)),
        ],
        auditOutcomes: events.map((event) => ({
          type: event.type,
          outcome: event.outcome,
          action: event.action,
          reason: event.reason,
        })),
      },
      null,
      2,
    ),
  );
}

void main();
