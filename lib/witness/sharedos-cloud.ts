import type { AuditEvent } from "@aicoo/sharedos";

const DEFAULT_AUDIT_URL = "https://www.sharedos.ai/v1/audit/events";

export type CloudAuditExport = {
  enabled: boolean;
  status: "disabled" | "synced" | "failed";
  eventCount: number;
  endpoint: string;
  error?: string;
};

type ExportOptions = {
  key?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

export async function exportAuditEventsToSharedOS(
  events: AuditEvent[],
  options: ExportOptions = {},
): Promise<CloudAuditExport> {
  const key = options.key ?? process.env.SHAREDOS_KEY?.trim();
  const endpoint = options.endpoint ?? process.env.SHAREDOS_AUDIT_URL ?? DEFAULT_AUDIT_URL;

  if (!key) return { enabled: false, status: "disabled", eventCount: events.length, endpoint };
  if (events.length === 0) return { enabled: true, status: "synced", eventCount: 0, endpoint };

  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(6_000),
    });

    if (!response.ok) {
      return {
        enabled: true,
        status: "failed",
        eventCount: events.length,
        endpoint,
        error: `SharedOS Cloud returned HTTP ${response.status}`,
      };
    }

    return { enabled: true, status: "synced", eventCount: events.length, endpoint };
  } catch (error) {
    return {
      enabled: true,
      status: "failed",
      eventCount: events.length,
      endpoint,
      error: error instanceof Error ? error.message : "SharedOS Cloud audit export failed",
    };
  }
}
