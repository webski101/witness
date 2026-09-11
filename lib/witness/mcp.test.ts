import assert from "node:assert/strict";
import test from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { witnessMcpHandler } from "./mcp";

test("MCP exposes the paid probe and docket tools", async () => {
  const client = new Client(
    { name: "witness-test-client", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  const transport = new StreamableHTTPClientTransport(new URL("https://witness.test/api/mcp"), {
    fetch: (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      return witnessMcpHandler.fetch(request);
    },
  });

  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    ["docket", "probe"],
  );
  assert.match(tools.find((tool) => tool.name === "probe")?.description ?? "", /real execution/i);
  await client.close();
});

test("MCP probe rejects a multi-claim request before execution", async () => {
  const client = new Client(
    { name: "witness-test-client", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  const transport = new StreamableHTTPClientTransport(new URL("https://witness.test/api/mcp"), {
    fetch: (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      return witnessMcpHandler.fetch(request);
    },
  });

  await client.connect(transport);
  const result = await client.callTool({
    name: "probe",
    arguments: {
      productName: "Invalid bundle",
      serviceName: "invalid",
      targetUrl: "https://seller.example/service",
      claims: [
        { id: "a", kind: "availability", statement: "up", expect: { status: 200 } },
        { id: "b", kind: "schema", statement: "shape", expect: { jsonKeys: ["ok"] } },
      ],
    },
  });
  assert.equal(result.isError, true);
  assert.match(
    result.content
      .filter((item): item is Extract<typeof item, { type: "text" }> => item.type === "text")
      .map((item) => item.text)
      .join(" "),
    /invalid|expected|array/i,
  );
  await client.close();
});
