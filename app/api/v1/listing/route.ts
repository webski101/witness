import { listing } from "@/lib/witness/listing";

export async function GET() {
  return Response.json(listing);
}
