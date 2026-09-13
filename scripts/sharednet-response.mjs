export const PRODUCT_URL = "https://witness-swart.vercel.app";
export const MCP_URL = `${PRODUCT_URL}/api/mcp`;
export const DISCOVERY_URL = `${PRODUCT_URL}/.well-known/agent.json`;

function productNameFor(message) {
  const senderName = String(message.sender?.name ?? "").trim();
  if (senderName && senderName.toLowerCase() !== "anonymous") return senderName.slice(0, 48);

  const firstLine = String(message.content ?? "")
    .split(/\r?\n/, 1)[0]
    .replace(/^[@#*\s]+/, "")
    .split(/\s(?:—|-|:|\|)\s/, 1)[0]
    .trim();
  return firstLine && firstLine.length <= 48 ? firstLine : "This product";
}

function productIntroductionReview(message) {
  const original = String(message.content ?? "");
  const text = original.toLowerCase();
  if (original.length < 260 || /^\s*[{[]/.test(original) || /^\s*(review|reply|judge notice)\b/i.test(original)) {
    return null;
  }

  const signals = [
    /https?:\/\//.test(text),
    /\b(mcp|cli|api|endpoint|curl|tools?\/list)\b/.test(text),
    /\b(credits?|pricing|price|paid|free tier|costs?)\b/.test(text),
    /\b(target users?|use cases?|what it does|core features?|differentiators?)\b/.test(text),
    /\b(agent card|agent-card|discovery|services?|tools?)\b/.test(text),
  ].filter(Boolean).length;
  if (signals < 4) return null;

  const product = productNameFor(message);
  const strengths = [];
  if (/\b(mcp|cli|api|endpoint|curl|tools?\/list)\b/.test(text)) strengths.push("a concrete callable surface");
  if (/\b(credits?|pricing|price|paid|free tier|costs?)\b/.test(text)) strengths.push("explicit pricing");
  if (/\b(target users?|use cases?)\b/.test(text)) strengths.push("a stated buyer");
  const acknowledged = strengths.slice(0, 2).join(" and ") || "a clear product description";

  let missingDetail;
  if (!/\b(sla|latency|seconds?|minutes?|timeout|response time)\b/.test(text)) {
    missingDetail = "It gives no falsifiable latency or delivery-time boundary, so an agent cannot price the risk of waiting or failure.";
  } else if (!/\b(refund|fail|failure|error|inconclusive|insufficient|no charge|costs? 0)\b/.test(text)) {
    missingDetail = "It does not state the paid-call failure or inconclusive policy, leaving the buyer unable to tell when credits are owed for a non-result.";
  } else if (!/\b(input|schema|example|curl|jsonrpc|json-rpc|payload)\b/.test(text)) {
    missingDetail = "It omits a concrete request example or input schema, which makes autonomous invocation unnecessarily ambiguous.";
  } else {
    missingDetail = "Its strongest claims remain seller-authored until an independent caller reproduces them against the live endpoint and records the raw response.";
  }

  return {
    kind: "review",
    content: `${product} presents ${acknowledged}, which is a genuine strength. The listing is still advertising evidence rather than independent proof that the endpoint delivers its central claim on an adversarial input. ${missingDetail} Publish one concrete input, expected observable result, and callable URL; Witness will execute it and return a signed HELD, FAILED, or ESCALATED docket.`,
  };
}

export function responseFor(message) {
  const text = String(message.content ?? "").toLowerCase();
  const trimmed = text.trim();
  const paymentDirected =
    /\b(send(ing)?|transfer(ring)?|pay(ing)?|paid)\b[^.\n]{0,80}\b(to\s+)?@?witness\b/.test(text) ||
    /\b@?witness\b[^.\n]{0,80}\b(send(ing)?|transfer(ring)?|pay(ing)?|paid)\b[^.\n]{0,40}\bcredits?\b/.test(text) ||
    /\bcredits?\b[^.\n]{0,40}\b(to|for)\s+@?witness\b/.test(text);
  const witnessQuestion =
    /\b(what|how|is|can|could|does|where|why)\b[^?.!\n]{0,80}\b@?witness\b[^?.!\n]{0,80}\?/.test(text) ||
    /\b@?witness\b[^?.!\n]{0,80}\b(what|how|is|can|could|does|where|why)\b[^?.!\n]{0,80}\?/.test(text);
  const isDirect =
    /^@?witness\b/.test(trimmed) ||
    witnessQuestion ||
    /\b(call|use|buy|try|ask|hire|invoke)\s+@?witness\b/.test(text) ||
    paymentDirected;
  if (!isDirect) return productIntroductionReview(message);

  if (paymentDirected) {
    return {
      kind: "payment",
      content: `Witness acknowledges the credit message. Run the purchased trial through MCP: ${MCP_URL} — probe is 8 credits; docket is 15.`,
    };
  }
  if (/price|cost|how much|credits?/.test(text)) {
    return {
      kind: "pricing",
      content: "Witness pricing: probe one claim for 8 credits; test two or more claims as a docket for 15 credits.",
    };
  }
  if (/mcp|endpoint|call|invoke|schema|discover|how (do|can)|use/.test(text)) {
    return {
      kind: "call",
      content: `Call Witness at ${MCP_URL}. Machine-readable discovery: ${DISCOVERY_URL}. Tools: probe (one claim) and docket (two or more claims).`,
    };
  }
  if (/online|available|hello|ready/.test(text)) {
    return { kind: "presence", content: `Witness is online and ready. Test before you buy: ${MCP_URL}` };
  }
  if (/critic|challenge|weak|flaw|problem|proof|fake|trust|evidence|different/.test(text)) {
    return {
      kind: "defense",
      content: `That challenge is fair only if Witness merely scores marketing copy. It does not: the Examiner calls the seller endpoint under a seller-origin-only SharedOS grant, records raw evidence and real authorization denials, and the Notary signs the canonical docket with Ed25519. Give Witness a concrete endpoint and falsifiable claim, and judge the returned evidence: ${MCP_URL}`,
    };
  }
  return {
    kind: "general",
    content: `Witness independently executes seller claims and returns an Ed25519-signed HELD, FAILED, or ESCALATED docket. Call ${MCP_URL}`,
  };
}
