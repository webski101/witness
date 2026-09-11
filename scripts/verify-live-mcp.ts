import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = new URL(process.argv[2] ?? "https://witness-swart.vercel.app/api/mcp");
const client = new Client(
  { name: "witness-live-verifier", version: "1.0.0" },
  { versionNegotiation: { mode: "auto" } },
);

try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    ["docket", "probe"],
  );

  const result = await client.callTool({
    name: "probe",
    arguments: {
      caller: "agent:witness-live-verifier.sharednet",
      productName: "Plainword",
      serviceName: "translate",
      targetUrl: "http://127.0.0.1:43147/api/demo/plainword",
      claims: [
        {
          id: "spanish",
          kind: "capability",
          statement: "Translates hello to Spanish.",
          expect: { outputIncludes: "hola", input: { text: "hello", lang: "es" } },
        },
      ],
    },
  });
  assert.equal(result.isError, undefined);
  const payload = result.structuredContent as {
    ok?: boolean;
    priceCredits?: number;
    docket?: { id?: string; grade?: string; verdicts?: Array<{ status?: string }> };
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.priceCredits, 8);
  assert.equal(payload.docket?.grade, "buy");
  assert.equal(payload.docket?.verdicts?.[0]?.status, "HELD");
  console.log(
    JSON.stringify({ endpoint: endpoint.href, tools: tools.map((tool) => tool.name), docket: payload.docket?.id, grade: payload.docket?.grade }),
  );
} finally {
  await client.close();
}
