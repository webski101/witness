import { validateMcpRequest, witnessMcpHandler } from "@/lib/witness/mcp";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handle(request: Request) {
  return validateMcpRequest(request) ?? witnessMcpHandler.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

export async function OPTIONS(request: Request) {
  const rejected = validateMcpRequest(request);
  if (rejected) return rejected;

  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-protocol-version, mcp-session-id",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Origin": new URL(request.url).origin,
    },
  });
}
