import type { Claim } from "./types";

export interface DemoSeller {
  id: "plainword" | "omnibrain" | "northstar";
  productName: string;
  serviceName: string;
  targetUrl: string;
  expectedGrade: string;
  claims: Claim[];
}

export const DEMO_SELLERS: DemoSeller[] = [
  {
    id: "plainword",
    productName: "Plainword",
    serviceName: "translate",
    targetUrl: "http://127.0.0.1:43147/api/demo/plainword",
    expectedGrade: "buy",
    claims: [
      { id: "lat", kind: "latency_ms", statement: "Responds under 400ms.", expect: { maxLatencyMs: 400, input: { text: "hello", lang: "es" } } },
      { id: "schema", kind: "schema", statement: "Returns translation fields.", expect: { jsonKeys: ["text", "translated", "lang"], input: { text: "hello", lang: "es" } } },
      { id: "spanish", kind: "capability", statement: "Translates hello to Spanish.", expect: { outputIncludes: "hola", input: { text: "hello", lang: "es" } } },
    ],
  },
  {
    id: "omnibrain",
    productName: "OmniBrain XL",
    serviceName: "universal-reason",
    targetUrl: "http://127.0.0.1:43147/api/demo/omnibrain",
    expectedGrade: "do-not-buy",
    claims: [
      { id: "lat", kind: "latency_ms", statement: "Responds under 50ms.", expect: { maxLatencyMs: 50, input: { text: "hello" } } },
      { id: "japanese", kind: "capability", statement: "Produces Japanese for hello.", expect: { outputIncludes: "こんにちは", input: { text: "hello", lang: "ja" } } },
      { id: "isolation", kind: "no_cross_tenant_leak", statement: "Never leaks another tenant's input.", expect: {} },
    ],
  },
  {
    id: "northstar",
    productName: "Northstar",
    serviceName: "fact-check",
    targetUrl: "http://127.0.0.1:43147/api/demo/northstar",
    expectedGrade: "caution",
    claims: [
      { id: "available", kind: "availability", statement: "Service is available.", expect: { status: 200 } },
      { id: "paris", kind: "capability", statement: "Knows the capital of France.", expect: { outputIncludes: "Paris", input: { question: "capital of France" } } },
      { id: "boiling", kind: "capability", statement: "Knows the boiling point of water.", expect: { outputIncludes: "100", input: { question: "boiling point" } } },
    ],
  },
];

export function demoById(id: string): DemoSeller | undefined {
  return DEMO_SELLERS.find((seller) => seller.id === id);
}
