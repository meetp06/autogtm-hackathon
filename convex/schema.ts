import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const campaignStatus = v.union(
  v.literal("queued"),
  v.literal("researching"),
  v.literal("angle_ready"),
  v.literal("building_audience"),
  v.literal("finding_audience"),
  v.literal("audience_ready"),
  v.literal("creative_ready"),
  v.literal("ready_to_post"),
  v.literal("posted"),
  v.literal("failed")
);

export default defineSchema({
  campaigns: defineTable({
    product: v.string(),
    description: v.string(),
    audience: v.string(),
    differentiator: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("linkedin"), v.literal("both")),
    priceTier: v.union(v.literal("budget"), v.literal("mid"), v.literal("premium")),
    mode: v.optional(v.union(v.literal("b2c"), v.literal("b2b"))),
    icpQuery: v.optional(v.string()),
    status: campaignStatus,
    isSampleData: v.optional(v.boolean()),
    isSampleProspects: v.optional(v.boolean()),
    qcHumanOverride: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
  }).index("by_status", ["status"]),

  brandKits: defineTable({
    campaignId: v.id("campaigns"),
    brandKitId: v.string(),
    positioning: v.string(),
    audience: v.string(),
    voice: v.string(),
    valueProps: v.array(v.string()),
    primaryColor: v.string(),
    accentColor: v.optional(v.string()),
    productPhotos: v.array(v.string()),
    source: v.union(v.literal("gooseworks"), v.literal("local")),
  }).index("by_campaign", ["campaignId"]),

  signals: defineTable({
    campaignId: v.id("campaigns"),
    type: v.union(
      v.literal("why_buy"),
      v.literal("why_not"),
      v.literal("buying_intent"),
      v.literal("creative_gap")
    ),
    text: v.string(),
    sourceUrl: v.string(),
    competitor: v.string(),
  }).index("by_campaign", ["campaignId"]),

  demand: defineTable({
    campaignId: v.id("campaigns"),
    gap: v.string(),
    angleHeadline: v.string(),
    reason: v.string(),
    emotion: v.string(),
  }).index("by_campaign", ["campaignId"]),

  audiences: defineTable({
    campaignId: v.id("campaigns"),
    fiberAudienceId: v.string(),
    query: v.string(),
    estimatedCredits: v.number(),
    availableCredits: v.optional(v.number()),
    listSize: v.number(),
    state: v.union(
      v.literal("built"),
      v.literal("estimated"),
      v.literal("enriching"),
      v.literal("enriched"),
      v.literal("exported"),
      v.literal("sample")
    ),
    chargeInfo: v.optional(v.any()),
    confirmedAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_campaign", ["campaignId"]),

  prospects: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    role: v.string(),
    company: v.string(),
    linkedinUrl: v.string(),
    workEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    companyContext: v.string(),
    intentSignal: v.string(),
    source: v.optional(v.string()),
    sourceUrl: v.string(),
    enrichedAt: v.string(),
  }).index("by_campaign", ["campaignId"]),

  outreach: defineTable({
    campaignId: v.id("campaigns"),
    prospectId: v.id("prospects"),
    platform: v.literal("linkedin"),
    draftMessage: v.string(),
    state: v.union(v.literal("draft"), v.literal("approved"), v.literal("sent")),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_prospect", ["prospectId"]),

  creatives: defineTable({
    campaignId: v.id("campaigns"),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    imagePrompt: v.string(),
    caption: v.string(),
    cta: v.string(),
    hashtags: v.array(v.string()),
    postTime: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("linkedin")),
    qcStatus: v.optional(
      v.union(v.literal("pass"), v.literal("fail"), v.literal("needs_human"))
    ),
    qcReportUrl: v.optional(v.string()),
    source: v.optional(v.union(v.literal("gooseworks"), v.literal("fallback"))),
    format: v.optional(v.union(v.literal("image"), v.literal("video"))),
    brandKitId: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]),

  posts: defineTable({
    campaignId: v.id("campaigns"),
    platform: v.union(v.literal("instagram"), v.literal("linkedin")),
    externalId: v.optional(v.string()),
    state: v.union(v.literal("draft"), v.literal("approved"), v.literal("published")),
    approvedBy: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]),

  activityLogs: defineTable({
    campaignId: v.id("campaigns"),
    agent: v.union(
      v.literal("system"),
      v.literal("market"),
      v.literal("demand"),
      v.literal("audience"),
      v.literal("creative"),
      v.literal("distribution")
    ),
    message: v.string(),
    level: v.union(v.literal("info"), v.literal("success"), v.literal("warn"), v.literal("error")),
  }).index("by_campaign", ["campaignId"]),
});
