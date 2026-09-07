import { z } from "zod";
import { CLAIM_KINDS } from "./types";

const ClaimSchema = z.object({
  id: z.string().trim().min(1).max(80),
  kind: z.enum(CLAIM_KINDS),
  statement: z.string().trim().min(1).max(500),
  expect: z.record(z.string(), z.unknown()),
});

export const TrialRequestSchema = z.object({
  caller: z.string().trim().min(1).max(160).default("agent:anonymous.arena"),
  productName: z.string().trim().min(1).max(160),
  serviceName: z.string().trim().min(1).max(160),
  targetUrl: z.string().trim().min(1).max(2048),
  claims: z.array(ClaimSchema).min(1).max(20),
});
