import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { sendGmail } from "@/lib/orangeslice/client";

export const maxDuration = 60;

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

export async function POST(req: NextRequest) {
  try {
    const { campaignId, outreachId } = (await req.json()) as {
      campaignId: Id<"campaigns">;
      outreachId: Id<"outreach">;
    };
    if (!campaignId || !outreachId) {
      return NextResponse.json({ error: "campaignId and outreachId required" }, { status: 400 });
    }

    const convex = getConvex();
    const [outreach, demand, campaign] = await Promise.all([
      convex.query(api.campaigns.getOutreach, { campaignId }),
      convex.query(api.campaigns.getDemand, { campaignId }),
      convex.query(api.campaigns.get, { campaignId }),
    ]);

    const row = outreach.find((r) => r._id === outreachId);
    if (!row) return NextResponse.json({ error: "Outreach not found" }, { status: 404 });

    // Idempotency: never re-send an already-sent draft (caps repeat-send abuse).
    if (row.state === "sent") {
      return NextResponse.json({ ok: true, alreadySent: true });
    }

    const to = row.prospect?.workEmail;
    if (!to) {
      return NextResponse.json({ error: "No work email for this prospect" }, { status: 400 });
    }

    const subject = demand?.angleHeadline ?? campaign?.product ?? "Quick intro";
    const result = await sendGmail({ to, subject, body: row.draftMessage });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Gmail send failed" }, { status: 502 });
    }

    await convex.mutation(api.campaigns.markOutreachSent, { campaignId, outreachId, via: "gmail" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}
