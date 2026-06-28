import { NextRequest, NextResponse } from "next/server";
import { confirmAudienceEnrichment, runPipeline } from "@/lib/pipeline";
import { Id } from "convex/_generated/dataModel";

// The pipeline runs the full multi-agent flow synchronously in this request;
// Orange Slice and data enrichment can take minutes, so lift the per-route timeout ceiling.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { campaignId, action } = (await req.json()) as {
      campaignId: Id<"campaigns">;
      action?: "confirm_audience_enrichment";
    };
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }

    if (action === "confirm_audience_enrichment") {
      await confirmAudienceEnrichment(campaignId);
    } else {
      await runPipeline(campaignId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
