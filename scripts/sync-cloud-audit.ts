import { exportAuditEventsToSharedOS } from "../lib/witness/sharedos-cloud";
import { getStore } from "../lib/witness/store";

const traceId = process.argv[2];
if (!traceId?.startsWith("wkt_")) {
  throw new Error("Usage: npm run sharedos:sync -- wkt_<docket-id>");
}

const store = getStore();
const events = await store.getAuditEvents(traceId);
if (events.length === 0) throw new Error(`No audit events found for ${traceId}`);

const result = await exportAuditEventsToSharedOS(events);
await store.saveCloudAuditExport(traceId, result);

console.log(JSON.stringify({ traceId, ...result }, null, 2));
if (result.status !== "synced") process.exitCode = 1;
