import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import type { AuditEvent } from "@aicoo/sharedos";
import { demoSellerInput } from "./demo-input";
import { exportAuditEventsToSharedOS } from "./sharedos-cloud";
import { getPublicKeyDescription, verifyPayload } from "./signature";
import { WitnessStore } from "./store";
import { runTrial, unsignedPayloadFromDocket } from "./trial";

test("Witness executes fixtures, signs dockets, escalates, and persists", async () => {
  const directory = mkdtempSync(join(tmpdir(), "witness-trial-"));
  const path = join(directory, "test.sqlite");
  const store = new WitnessStore(path);
  try {
    const plainword = await runTrial(demoSellerInput("plainword"), store);
    assert.equal(plainword.docket.grade, "buy");
    assert.deepEqual(plainword.docket.verdicts.map((item) => item.status), ["HELD", "HELD", "HELD"]);
    assert.equal(store.getCloudAuditExport(plainword.docket.id)?.status, "disabled");

    const omni = await runTrial(demoSellerInput("omnibrain"), store);
    assert.equal(omni.docket.grade, "do-not-buy");
    assert.equal(omni.docket.verdicts.find((item) => item.claimId === "isolation")?.status, "FAILED");
    assert.equal(omni.docket.verdicts.find((item) => item.claimId === "lat")?.status, "FAILED");
    assert.ok(omni.timeline.some((event) => event.actor === "agent:skeptic.witness" && event.action === "http.fetch" && event.decision === "DENIED"));
    assert.ok(omni.timeline.some((event) => event.actor === "agent:examiner.witness" && event.resource.includes("wkt_foreign") && event.decision === "DENIED"));
    assert.ok(omni.timeline.some((event) => event.actor === "agent:clerk.witness" && event.action === "crypto.sign-docket" && event.decision === "DENIED"));

    const northstar = await runTrial(demoSellerInput("northstar"), store);
    assert.equal(northstar.docket.grade, "caution");
    assert.equal(northstar.docket.verdicts.find((item) => item.claimId === "paris")?.status, "HELD");
    assert.equal(northstar.docket.verdicts.find((item) => item.claimId === "boiling")?.status, "FAILED");

    const publicKey = await getPublicKeyDescription(store);
    assert.equal(verifyPayload(unsignedPayloadFromDocket(plainword.docket), plainword.docket.signature, publicKey.publicKey), true);

    const unavailable = await runTrial({ ...demoSellerInput("plainword"), productName: "Unavailable fixture", targetUrl: "http://127.0.0.1:43147/api/demo/plainword?mode=unavailable", claims: [{ id: "cap", kind: "capability", statement: "Returns hola.", expect: { outputIncludes: "hola", input: { text: "hello" } } }] }, store);
    assert.equal(unavailable.docket.grade, "inconclusive");
    assert.equal(unavailable.docket.verdicts[0].status, "ESCALATED");
    assert.ok(unavailable.timeline.some((event) => event.decision === "ESCALATED" && event.reason === "escalation_requested"));

    const persistedId = plainword.docket.id;
    store.close();
    const reopened = new WitnessStore(path);
    try {
      assert.equal(reopened.getDocket(persistedId)?.id, persistedId, "docket must survive store reinitialization");
      assert.ok(reopened.getAuditEvents(persistedId).length > 0, "audit must survive store reinitialization");
    } finally {
      reopened.close();
    }
  } finally {
    try { store.close(); } catch {}
    rmSync(directory, { recursive: true, force: true });
  }
});

test("SharedOS Cloud audit export uses the project key and one bounded batch", async () => {
  let authorization = "";
  let body = "";
  const result = await exportAuditEventsToSharedOS(
    [{ type: "authorization.decision", traceId: "wkt_test" } as unknown as AuditEvent],
    {
      key: "test-project-key",
      fetchImpl: async (_input, init) => {
        authorization = new Headers(init?.headers).get("authorization") ?? "";
        body = String(init?.body);
        return new Response(null, { status: 202 });
      },
    },
  );

  assert.equal(result.status, "synced");
  assert.equal(result.eventCount, 1);
  assert.equal(authorization, "Bearer test-project-key");
  assert.equal(JSON.parse(body).events[0].traceId, "wkt_test");
});
