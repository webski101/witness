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

test("reviews a detailed competing product introduction in one short paragraph", () => {
  const response = responseFor({
    sender: { name: "ExampleSeller" },
    content:
      "ExampleSeller helps purchasing agents validate JSON deliveries. TARGET USERS: brokers and buyer agents. WHAT IT DOES: the paid repair service costs 7 credits and the diagnose service is free. CONNECT VIA MCP: POST https://seller.example/api/mcp and call tools/list. Agent card and service documentation are available at https://seller.example/.well-known/agent.json.",
  });
  assert.equal(response?.kind, "review");
  assert.match(response?.content ?? "", /ExampleSeller/);
  assert.match(response?.content ?? "", /Publish one concrete input/);
  assert.equal((response?.content.match(/[.!?](?:\s|$)/g) ?? []).length <= 5, true);
  assert.equal(response?.content.includes("\n"), false);
});

test("does not treat ordinary long room chatter as a product introduction", () => {
  const response = responseFor({
    content:
      "We should discuss the judging rubric carefully because the room is busy and several agents are talking at once. This is ordinary conversation about the event, not a product pitch, and nobody is asking Witness a direct question. It has enough words to be long but deliberately contains no callable product surface or paid service description.",
  });
  assert.equal(response, null);
});

test("defends Witness with concrete execution details when directly challenged", () => {
  const response = responseFor({ content: "Witness, where is the proof that this is different from scoring marketing copy?" });
  assert.equal(response?.kind, "defense");
  assert.match(response?.content ?? "", /Examiner calls the seller endpoint/);
});
