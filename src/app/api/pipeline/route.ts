import { NextRequest, NextResponse } from "next/server";
import { confirmFiberAudience, runPipeline } from "@/lib/pipeline";
import { Id } from "convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  try {
    const { campaignId, action } = (await req.json()) as {
      campaignId: Id<"campaigns">;
      action?: "confirm_fiber_enrichment";
    };
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }

    if (action === "confirm_fiber_enrichment") {
      await confirmFiberAudience(campaignId);
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
