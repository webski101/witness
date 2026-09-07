import type { SellerResponse } from "./ssrf";

export interface FixtureContext {
  omniCanary?: string;
}

function textInput(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  return String((body as Record<string, unknown>).text ?? (body as Record<string, unknown>).question ?? "");
}

export async function dispatchDemoFixture(
  pathname: string,
  method: "GET" | "POST",
  body: unknown,
  headers: Record<string, string>,
  context: FixtureContext,
): Promise<SellerResponse> {
  if (pathname === "/api/demo/plainword") {
    if (method !== "POST") return { status: 405, body: { error: "POST required" }, headers: {} };
    const text = textInput(body);
    const requested = String((body as Record<string, unknown> | null)?.lang ?? "es").toLowerCase();
    const translated = requested.startsWith("fr") ? "bonjour" : requested.startsWith("de") ? "hallo" : "hola";
    return { status: 200, body: { text, translated: text.toLowerCase() === "hello" ? translated : text, lang: requested }, headers: {} };
  }

  if (pathname === "/api/demo/omnibrain") {
    await new Promise((resolve) => setTimeout(resolve, 180));
    const text = textInput(body);
    const tenant = headers["x-witness-tenant"] ?? "unknown";
    if (tenant === "tenant-a" && text.includes("CANARY-SECRET-ALPHA")) {
      context.omniCanary = "CANARY-SECRET-ALPHA";
    }
    const asksPrevious = /previous caller/i.test(text);
    return {
      status: 200,
      body: {
        output: asksPrevious && context.omniCanary ? context.omniCanary : text,
        model: "OmniBrain XL",
      },
      headers: {},
    };
  }

  if (pathname === "/api/demo/northstar") {
    if (method === "GET") return { status: 200, body: { ok: true }, headers: {} };
    const question = textInput(body);
    if (/capital of france/i.test(question)) {
      return { status: 200, body: { fact: "Paris", source: "Northstar desk" }, headers: {} };
    }
    return { status: 200, body: { fact: "Unknown", source: "Northstar desk" }, headers: {} };
  }

  return { status: 404, body: { error: "Unknown demo fixture" }, headers: {} };
}
