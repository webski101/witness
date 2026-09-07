import { demoById, type DemoSeller } from "./demos";
import type { TrialRequest } from "./types";

export function demoSellerInput(id: DemoSeller["id"]): TrialRequest {
  const seller = demoById(id);
  if (!seller) throw new Error(`Unknown demo seller: ${id}`);
  return {
    caller: "agent:arena-demo.sharednet",
    productName: seller.productName,
    serviceName: seller.serviceName,
    targetUrl: seller.targetUrl,
    claims: seller.claims,
  };
}
