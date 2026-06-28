import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { enrichAudience, prepareAudience } from "@/lib/agents/audienceFinder";
import { runCreativeStudio } from "@/lib/agents/creativeStudio";
import { runDemandGap, runMarketPulse, runPersonalizedOutreach } from "@/lib/agents";
import { GooseworksClient } from "@/lib/gooseworks/client";

type CampaignForPipeline = {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  platform: "instagram" | "linkedin" | "both";
  priceTier: "budget" | "mid" | "premium";
  mode?: "b2c" | "b2b";
  icpQuery?: string;
};

type DemandForPipeline = {
  angleHeadline: string;
  reason: string;
};

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

async function saveCreativeResult(
  convex: ConvexHttpClient,
  campaignId: Id<"campaigns">,
  result: Awaited<ReturnType<typeof runCreativeStudio>>
) {
  let imageStorageId: Id<"_storage"> | undefined;
  if (result.imageBase64) {
    const uploadUrl = await convex.mutation(api.campaigns.generateUploadUrl, {});
    const bytes = Buffer.from(result.imageBase64, "base64");
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: bytes,
    });
    const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> };
    imageStorageId = storageId;
  }

  await convex.mutation(api.campaigns.saveCreative, {
    campaignId,
    imageStorageId,
    imagePrompt: result.creative.image_prompt,
    caption: result.creative.caption,
    cta: result.creative.cta,
    hashtags: result.creative.hashtags,
    postTime: result.creative.post_time,
    platform: result.creative.platform,
    qcStatus: result.qcStatus,
    qcReportUrl: result.qcReportUrl,
    source: result.source,
    format: result.format,
    brandKitId: result.brandKitId,
  });
}

export async function runPipeline(campaignId: Id<"campaigns">) {
  const convex = getConvex();
  const campaign = await convex.query(api.campaigns.get, { campaignId });
  if (!campaign) throw new Error("Campaign not found");

  const isB2B = (campaign.mode ?? "b2c") === "b2b";

  try {
    await convex.mutation(api.campaigns.setStatus, { campaignId, status: "researching" });
    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "market",
      message: isB2B
        ? "Market Pulse — Firecrawl reviews + Fiber intent signals + Gooseworks competitor-ad-intelligence..."
        : "Market Pulse — Firecrawl reviews + Gooseworks competitor creative watch...",
      level: "info",
    });

    const market = await runMarketPulse({
      product: campaign.product,
      description: campaign.description,
      audience: campaign.audience,
      differentiator: campaign.differentiator,
      mode: campaign.mode,
      icp: campaign.icpQuery ?? campaign.audience,
    });

    await convex.mutation(api.campaigns.saveMarketPulse, {
      campaignId,
      output: market.output,
      isSample: market.isSample,
    });

    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "demand",
      message: "Demand Gap agent analyzing verified signals...",
      level: "info",
    });

    const signals = await convex.query(api.campaigns.getSignals, { campaignId });
    const demand = await runDemandGap({
      product: campaign.product,
      differentiator: campaign.differentiator,
      signals,
    });

    await convex.mutation(api.campaigns.saveDemand, {
      campaignId,
      gap: demand.gap,
      angleHeadline: demand.angle_headline,
      reason: demand.supporting_reason,
      emotion: demand.target_emotion,
    });

    await convex.mutation(api.campaigns.setStatus, {
      campaignId,
      status: "angle_ready",
      isSampleData: market.isSample,
    });

    const lockedDemand = {
      angleHeadline: demand.angle_headline,
      reason: demand.supporting_reason,
    };

    if (isB2B) {
      const shouldContinue = await prepareB2BAudience(convex, campaignId, campaign, lockedDemand);
      if (!shouldContinue) return;
    }

    await runCreativeAndDistribution(convex, campaignId, campaign, lockedDemand, isB2B);
  } catch (error) {
    await convex.mutation(api.campaigns.setStatus, {
      campaignId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Pipeline failed",
    });
    throw error;
  }
}

export async function confirmFiberAudience(campaignId: Id<"campaigns">) {
  const convex = getConvex();
  const campaign = await convex.query(api.campaigns.get, { campaignId });
  if (!campaign) throw new Error("Campaign not found");
  if ((campaign.mode ?? "b2c") !== "b2b") throw new Error("Fiber enrichment is only used in B2B mode");

  const demand = await convex.query(api.campaigns.getDemand, { campaignId });
  if (!demand) throw new Error("Demand angle not ready");

  const audienceEstimate = await convex.query(api.campaigns.getAudience, { campaignId });
  if (!audienceEstimate) throw new Error("Fiber audience estimate not ready");

  try {
    await convex.mutation(api.campaigns.setStatus, { campaignId, status: "building_audience" });
    await convex.mutation(api.campaigns.updateAudienceState, {
      campaignId,
      state: "enriching",
      confirmedAt: new Date().toISOString(),
    });
    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "audience",
      message: `User approved Fiber enrichment estimate (${audienceEstimate.estimatedCredits} credits). Polling every 30s...`,
      level: "info",
    });

    const audience = await enrichAudience({
      fiberAudienceId: audienceEstimate.fiberAudienceId,
      estimatedCredits: audienceEstimate.estimatedCredits,
    });

    await saveAudienceProspects(convex, campaignId, audience);
    await convex.mutation(api.campaigns.updateAudienceState, {
      campaignId,
      state: audience.isSample ? "sample" : "exported",
      listSize: audience.list_size,
      chargeInfo: audience.charge_info,
    });
    await convex.mutation(api.campaigns.setStatus, {
      campaignId,
      status: "audience_ready",
      isSampleProspects: audience.isSample,
    });

    await runCreativeAndDistribution(convex, campaignId, campaign, demand, true);
  } catch (error) {
    await convex.mutation(api.campaigns.setStatus, {
      campaignId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Fiber enrichment failed",
    });
    throw error;
  }
}

async function prepareB2BAudience(
  convex: ConvexHttpClient,
  campaignId: Id<"campaigns">,
  campaign: CampaignForPipeline,
  demand: DemandForPipeline
) {
  await convex.mutation(api.campaigns.setStatus, { campaignId, status: "building_audience" });
  await convex.mutation(api.campaigns.appendLog, {
    campaignId,
    agent: "audience",
    message: "Audience Finder (Fiber) — building the audience and estimating enrichment cost...",
    level: "info",
  });

  const audienceEstimate = await prepareAudience({
    icp: campaign.icpQuery ?? campaign.audience,
    angleHeadline: demand.angleHeadline,
    product: campaign.product,
  });

  await convex.mutation(api.campaigns.saveAudienceEstimate, {
    campaignId,
    fiberAudienceId: audienceEstimate.fiberAudienceId,
    query: audienceEstimate.query,
    estimatedCredits: audienceEstimate.estimatedCredits,
    availableCredits: audienceEstimate.availableCredits,
    listSize: audienceEstimate.listSize,
    state: audienceEstimate.isSample ? "sample" : "estimated",
    chargeInfo: audienceEstimate.chargeInfo,
  });

  if (!audienceEstimate.isSample) {
    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "audience",
      message: `Fiber estimate ready: ${audienceEstimate.estimatedCredits} credits for up to ${audienceEstimate.listSize} prospects. Awaiting your approval before enrichment.`,
      level: "warn",
    });
    return false;
  }

  const sampleAudience = await enrichAudience({
    fiberAudienceId: audienceEstimate.fiberAudienceId,
    estimatedCredits: audienceEstimate.estimatedCredits,
  });
  await saveAudienceProspects(convex, campaignId, sampleAudience);
  await convex.mutation(api.campaigns.setStatus, {
    campaignId,
    status: "audience_ready",
    isSampleProspects: true,
  });
  return true;
}

async function saveAudienceProspects(
  convex: ConvexHttpClient,
  campaignId: Id<"campaigns">,
  audience: Awaited<ReturnType<typeof enrichAudience>>
) {
  await convex.mutation(api.campaigns.saveProspects, {
    campaignId,
    prospects: audience.prospects.map((p) => ({
      name: p.name,
      role: p.role,
      company: p.company,
      linkedinUrl: p.linkedin_url,
      workEmail: p.work_email,
      phone: p.phone,
      companyContext: p.company_context,
      intentSignal: p.intent_signal,
      source: p.source,
      sourceUrl: p.source_url,
    })),
    isSample: audience.isSample,
  });
}

async function runCreativeAndDistribution(
  convex: ConvexHttpClient,
  campaignId: Id<"campaigns">,
  campaign: CampaignForPipeline,
  demand: DemandForPipeline,
  isB2B: boolean
) {
  const goose = new GooseworksClient();

  await convex.mutation(api.campaigns.appendLog, {
    campaignId,
    agent: "creative",
    message: "Creative Studio — Gooseworks brand kit + ad gen + verify-product-image QC...",
    level: "info",
  });

  const brandKit = await goose.buildBrandKit({
    product: campaign.product,
    description: campaign.description,
    audience: campaign.audience,
    differentiator: campaign.differentiator,
    angleHeadline: demand.angleHeadline,
    priceTier: campaign.priceTier,
  });

  await convex.mutation(api.campaigns.saveBrandKit, {
    campaignId,
    brandKitId: brandKit.brandKitId,
    positioning: brandKit.positioning,
    audience: brandKit.audience,
    voice: brandKit.voice,
    valueProps: brandKit.valueProps,
    primaryColor: brandKit.colors.primary,
    accentColor: brandKit.colors.accent,
    productPhotos: brandKit.productPhotos,
    source: brandKit.source,
  });

  const creativeResult = await runCreativeStudio({
    product: campaign.product,
    description: campaign.description,
    audience: campaign.audience,
    differentiator: campaign.differentiator,
    angleHeadline: demand.angleHeadline,
    platform: isB2B ? "linkedin" : campaign.platform,
    priceTier: campaign.priceTier,
    brandKit,
  });

  await saveCreativeResult(convex, campaignId, creativeResult);

  if (isB2B) {
    const prospects = await convex.query(api.campaigns.getProspects, { campaignId });
    const outreachDrafts = await runPersonalizedOutreach({
      product: campaign.product,
      angleHeadline: demand.angleHeadline,
      differentiator: campaign.differentiator,
      prospects: prospects.map((p) => ({
        name: p.name,
        role: p.role,
        company: p.company,
        companyContext: p.companyContext,
        intentSignal: p.intentSignal,
        linkedinUrl: p.linkedinUrl,
      })),
    });
    await convex.mutation(api.campaigns.saveOutreach, { campaignId, items: outreachDrafts });
  }

  const platform = isB2B ? "linkedin" : campaign.platform === "both" ? "instagram" : campaign.platform;

  if (creativeResult.qcStatus === "pass") {
    await convex.mutation(api.campaigns.setStatus, { campaignId, status: "creative_ready" });
    await convex.mutation(api.campaigns.createDraftPost, { campaignId, platform });
    if (!isB2B && campaign.platform === "both") {
      await convex.mutation(api.campaigns.createDraftPost, { campaignId, platform: "linkedin" });
    }
    await convex.mutation(api.campaigns.setStatus, { campaignId, status: "ready_to_post" });
    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "system",
      message: isB2B
        ? "QC passed — review broadcast + outreach drafts before sending"
        : "QC passed — awaiting your approval to publish",
      level: "success",
    });
  } else {
    await convex.mutation(api.campaigns.setStatus, { campaignId, status: "creative_ready" });
    await convex.mutation(api.campaigns.appendLog, {
      campaignId,
      agent: "creative",
      message: `QC ${creativeResult.qcStatus} — human override required before ready_to_post`,
      level: "warn",
    });
  }
}
