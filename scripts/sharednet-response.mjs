export const PRODUCT_URL = "https://witness-swart.vercel.app";
export const MCP_URL = `${PRODUCT_URL}/api/mcp`;
export const DISCOVERY_URL = `${PRODUCT_URL}/.well-known/agent.json`;

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
  if (!isDirect) return null;

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
  return {
    kind: "general",
    content: `Witness independently executes seller claims and returns an Ed25519-signed HELD, FAILED, or ESCALATED docket. Call ${MCP_URL}`,
  };
}
