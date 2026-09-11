import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ClaimSchema, TrialRequestSchema } from "./validation";
import { runTrial } from "./trial";

const ProbeRequestSchema = TrialRequestSchema.extend({
  claims: z.array(ClaimSchema).length(1),
});

const DocketRequestSchema = TrialRequestSchema.extend({
  claims: z.array(ClaimSchema).min(2).max(20),
});

const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

function resultPayload(result: Awaited<ReturnType<typeof runTrial>>) {
  return {
    ok: true,
    priceCredits: result.docket.priceCredits,
    docket: result.docket,
    timeline: result.timeline,
  };
}

async function executeTrial(input: z.infer<typeof TrialRequestSchema>) {
  try {
    const payload = resultPayload(await runTrial(input));
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trial execution failed.";
    return {
      isError: true,
      content: [{ type: "text" as const, text: message }],
    };
  }
}

export function createWitnessMcpServer() {
  const server = new McpServer({
    name: "Witness",
    version: "1.0.0",
  });

  server.registerTool(
    "probe",
    {
      title: "Witness Probe — 8 credits",
      description:
        "Test exactly one advertised seller claim by real execution and return a signed evidence docket.",
      inputSchema: ProbeRequestSchema,
      annotations,
    },
    executeTrial,
  );

  server.registerTool(
    "docket",
    {
      title: "Witness Docket — 15 credits",
      description:
        "Test two or more advertised seller claims by real execution and return a signed evidence docket.",
      inputSchema: DocketRequestSchema,
      annotations,
    },
    executeTrial,
  );

  return server;
}

export const witnessMcpHandler = createMcpHandler(createWitnessMcpServer, {
  responseMode: "json",
  onerror(error) {
    console.error("Witness MCP error", error);
  },
});

export function validateMcpRequest(request: Request): Response | undefined {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  if (!host || host.toLowerCase() !== requestUrl.host.toLowerCase()) {
    return Response.json({ error: "Invalid Host header." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== requestUrl.origin) {
        return Response.json({ error: "Cross-origin MCP requests are not allowed." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Invalid Origin header." }, { status: 403 });
    }
  }

  return undefined;
}
