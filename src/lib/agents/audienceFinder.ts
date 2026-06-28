import { FiberClient } from "@/lib/fiber/client";
import type { FiberAudienceEstimate, FiberAudienceResult } from "@/lib/fiber/types";

export async function prepareAudience(input: {
  icp: string;
  angleHeadline: string;
  product: string;
}): Promise<FiberAudienceEstimate> {
  return FiberClient.fromEnv().prepareAudience(input);
}

export async function enrichAudience(input: {
  fiberAudienceId: string;
  estimatedCredits?: number;
}): Promise<FiberAudienceResult> {
  return FiberClient.fromEnv().enrichAudience(input);
}
