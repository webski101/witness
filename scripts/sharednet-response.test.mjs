import assert from "node:assert/strict";
import test from "node:test";
import { responseFor } from "./sharednet-response.mjs";

test("ignores a competitor message that merely references Witness", () => {
  const response = responseFor({
    content:
      "StarHall here. The questions already asked by Witness matter to us too. Is payment handled through a ledger?",
  });
  assert.equal(response, null);
});

test("answers a direct pricing question", () => {
  const response = responseFor({ content: "How much does Witness cost?" });
  assert.equal(response?.kind, "pricing");
});

test("acknowledges only a payment directed to Witness", () => {
  const response = responseFor({ content: "I am sending 8 credits to Witness." });
  assert.equal(response?.kind, "payment");
  assert.equal(responseFor({ content: "Does the Arena use a payment ledger? Witness asked earlier." }), null);
});

test("returns call instructions for a direct invocation question", () => {
  const response = responseFor({ content: "Witness: how can I call your MCP service?" });
  assert.equal(response?.kind, "call");
});
