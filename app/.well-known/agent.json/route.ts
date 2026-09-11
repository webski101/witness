import { listing } from "@/lib/witness/listing";

export async function GET() {
  return Response.json({
    schemaVersion: "1.0",
    address: "service:witness.trial",
    name: listing.name,
    description: listing.shortDescription,
    purpose: listing.purpose,
    services: listing.services,
    endpoint: listing.call,
    mcp: listing.mcp,
    inputSchema: listing.inputSchema,
    outputSchema: listing.outputSchema,
    identities: listing.agentIdentities,
    publicKey: listing.publicKey,
  });
}
