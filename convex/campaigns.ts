import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { logActivity } from "./lib/logs";

export const create = mutation({
  args: {
    product: v.string(),
    description: v.string(),
    audience: v.string(),
    differentiator: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("linkedin"), v.literal("both")),
    priceTier: v.union(v.literal("budget"), v.literal("mid"), v.literal("premium")),
    mode: v.union(v.literal("b2c"), v.literal("b2b")),
    icpQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const campaignId = await ctx.db.insert("campaigns", {
      product: args.product,
      description: args.description,
      audience: args.audience,
      differentiator: args.differentiator,
      platform: args.platform,
      priceTier: args.priceTier,
      mode: args.mode,
      icpQuery: args.icpQuery ?? (args.mode === "b2b" ? args.audience : undefined),
      status: "queued",
    });
    await logActivity(ctx, campaignId, "system", `Campaign queued for "${args.product}" (${args.mode.toUpperCase()})`, "info");
    return campaignId;
  },
});

export const approvePost = mutation({
  args: {
    campaignId: v.id("campaigns"),
    approvedBy: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("linkedin")),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "ready_to_post") throw new Error("Campaign is not ready to post");

    const existing = await ctx.db
      .query("posts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { state: "approved", approvedBy: args.approvedBy });
    } else {
      await ctx.db.insert("posts", {
        campaignId: args.campaignId,
        platform: args.platform,
        state: "approved",
        approvedBy: args.approvedBy,
      });
    }

    await logActivity(
      ctx,
      args.campaignId,
      "distribution",
      `Post approved for ${args.platform} by ${args.approvedBy}`,
      "success"
    );

    const externalId = `staged-${args.platform}-${Date.now()}`;
    const post = await ctx.db
      .query("posts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (post) {
      await ctx.db.patch(post._id, { state: "published", externalId });
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    const allPostsPublished = posts.length > 0 && posts.every((row) => row.state === "published");

    if (allPostsPublished) {
      await ctx.db.patch(args.campaignId, { status: "posted" });
    }
    await logActivity(
      ctx,
      args.campaignId,
      "distribution",
      `Staged to ${args.platform} — review and post from your own account (human-in-the-loop)`,
      "success"
    );

    return { ok: true, externalId };
  },
});

export const approveOutreach = mutation({
  args: {
    campaignId: v.id("campaigns"),
    outreachId: v.id("outreach"),
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outreachId);
    if (!row || row.campaignId !== args.campaignId) throw new Error("Outreach not found");

    await ctx.db.patch(args.outreachId, { state: "approved" });
    await logActivity(
      ctx,
      args.campaignId,
      "distribution",
      `Outreach draft approved for prospect — user sends manually from their account`,
      "success"
    );
    return { ok: true };
  },
});

export const markOutreachSent = mutation({
  args: { campaignId: v.id("campaigns"), outreachId: v.id("outreach"), via: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outreachId);
    if (!row || row.campaignId !== args.campaignId) throw new Error("Outreach not found");
    await ctx.db.patch(args.outreachId, { state: "sent" });
    await logActivity(
      ctx,
      args.campaignId,
      "distribution",
      `Outreach email sent via ${args.via}`,
      "success"
    );
    return { ok: true };
  },
});

export const approveAllOutreach = mutation({
  args: {
    campaignId: v.id("campaigns"),
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("outreach")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    for (const row of rows) {
      if (row.state === "draft") {
        await ctx.db.patch(row._id, { state: "approved" });
      }
    }

    await logActivity(
      ctx,
      args.campaignId,
      "distribution",
      `All ${rows.length} outreach drafts approved — copy & send from your LinkedIn`,
      "success"
    );
    return { ok: true, count: rows.length };
  },
});

export const getProspects = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) =>
    ctx.db.query("prospects").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
});

export const getAudience = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) =>
    ctx.db.query("audiences").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).first(),
});

export const getOutreach = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const outreach = await ctx.db
      .query("outreach")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    return Promise.all(
      outreach.map(async (row) => {
        const prospect = await ctx.db.get(row.prospectId);
        return { ...row, prospect };
      })
    );
  },
});

export const get = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => ctx.db.get(args.campaignId),
});

export const getSignals = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) =>
    ctx.db.query("signals").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
});

export const getDemand = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) =>
    ctx.db.query("demand").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).first(),
});

export const getCreative = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const creative = await ctx.db
      .query("creatives")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
    if (!creative) return null;
    let imageUrl = creative.imageUrl;
    if (creative.imageStorageId && !imageUrl) {
      imageUrl = (await ctx.storage.getUrl(creative.imageStorageId)) ?? undefined;
    }
    return { ...creative, imageUrl };
  },
});

export const getPosts = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) =>
    ctx.db.query("posts").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).collect(),
});

export const getActivityLogs = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) =>
    ctx.db.query("activityLogs").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).order("asc").collect(),
});

// Pipeline mutations (called from Next.js API route)
export const setStatus = mutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(
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
    ),
    isSampleData: v.optional(v.boolean()),
    isSampleProspects: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { campaignId, status, isSampleData, isSampleProspects, errorMessage } = args;
    await ctx.db.patch(campaignId, {
      status,
      ...(isSampleData !== undefined ? { isSampleData } : {}),
      ...(isSampleProspects !== undefined ? { isSampleProspects } : {}),
      ...(errorMessage !== undefined ? { errorMessage } : {}),
    });
  },
});

export const appendLog = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    await logActivity(ctx, args.campaignId, args.agent, args.message, args.level);
  },
});

export const saveMarketPulse = mutation({
  args: { campaignId: v.id("campaigns"), output: v.any(), isSample: v.boolean() },
  handler: async (ctx, args) => {
    for (const item of args.output.why_buy ?? []) {
      await ctx.db.insert("signals", {
        campaignId: args.campaignId,
        type: "why_buy",
        text: item.text,
        sourceUrl: item.source_url,
        competitor: item.competitor,
      });
    }
    for (const item of args.output.why_not ?? []) {
      await ctx.db.insert("signals", {
        campaignId: args.campaignId,
        type: "why_not",
        text: item.text,
        sourceUrl: item.source_url,
        competitor: item.competitor,
      });
    }
    for (const item of args.output.creative_gaps ?? []) {
      await ctx.db.insert("signals", {
        campaignId: args.campaignId,
        type: "creative_gap",
        text: item.text,
        sourceUrl: item.source_url,
        competitor: item.competitor,
      });
    }
    for (const item of args.output.buying_intent ?? []) {
      await ctx.db.insert("signals", {
        campaignId: args.campaignId,
        type: "buying_intent",
        text: item.text,
        sourceUrl: item.source_url,
        competitor: item.company ?? item.competitor ?? "Intent signal",
      });
    }
    await logActivity(
      ctx,
      args.campaignId,
      "market",
      `Scanned ${args.output.reviews_scanned ?? 0} reviews${args.isSample ? " (sample insights)" : ""}`,
      args.isSample ? "warn" : "success"
    );
  },
});

export const saveDemand = mutation({
  args: {
    campaignId: v.id("campaigns"),
    gap: v.string(),
    angleHeadline: v.string(),
    reason: v.string(),
    emotion: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("demand", {
      campaignId: args.campaignId,
      gap: args.gap,
      angleHeadline: args.angleHeadline,
      reason: args.reason,
      emotion: args.emotion,
    });
    await logActivity(ctx, args.campaignId, "demand", `Locked angle: "${args.angleHeadline}"`, "success");
  },
});

export const saveAudienceEstimate = mutation({
  args: {
    campaignId: v.id("campaigns"),
    fiberAudienceId: v.string(),
    query: v.string(),
    estimatedCredits: v.number(),
    availableCredits: v.optional(v.number()),
    listSize: v.number(),
    state: v.union(v.literal("built"), v.literal("estimated"), v.literal("sample")),
    chargeInfo: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("audiences")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
    const now = new Date().toISOString();
    const payload = {
      campaignId: args.campaignId,
      fiberAudienceId: args.fiberAudienceId,
      query: args.query,
      estimatedCredits: args.estimatedCredits,
      ...(args.availableCredits !== undefined ? { availableCredits: args.availableCredits } : {}),
      listSize: args.listSize,
      state: args.state,
      ...(args.chargeInfo !== undefined ? { chargeInfo: args.chargeInfo } : {}),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("audiences", payload);
    }

    await logActivity(
      ctx,
      args.campaignId,
      "audience",
      args.state === "sample"
        ? `Fiber audience estimate unavailable — sample list queued`
        : `Fiber estimated ${args.estimatedCredits} credits for ${args.listSize} prospects`,
      args.state === "sample" ? "warn" : "success"
    );
  },
});

export const updateAudienceState = mutation({
  args: {
    campaignId: v.id("campaigns"),
    state: v.union(
      v.literal("built"),
      v.literal("estimated"),
      v.literal("enriching"),
      v.literal("enriched"),
      v.literal("exported"),
      v.literal("sample")
    ),
    estimatedCredits: v.optional(v.number()),
    listSize: v.optional(v.number()),
    chargeInfo: v.optional(v.any()),
    confirmedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const audience = await ctx.db
      .query("audiences")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
    if (!audience) throw new Error("Audience not found");

    await ctx.db.patch(audience._id, {
      state: args.state,
      ...(args.estimatedCredits !== undefined ? { estimatedCredits: args.estimatedCredits } : {}),
      ...(args.listSize !== undefined ? { listSize: args.listSize } : {}),
      ...(args.chargeInfo !== undefined ? { chargeInfo: args.chargeInfo } : {}),
      ...(args.confirmedAt !== undefined ? { confirmedAt: args.confirmedAt } : {}),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const saveBrandKit = mutation({
  args: {
    campaignId: v.id("campaigns"),
    brandKitId: v.string(),
    positioning: v.string(),
    audience: v.string(),
    voice: v.string(),
    valueProps: v.array(v.string()),
    primaryColor: v.string(),
    accentColor: v.optional(v.string()),
    productPhotos: v.array(v.string()),
    source: v.literal("local"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("brandKits", args);
    await logActivity(ctx, args.campaignId, "creative", `Brand kit ready (${args.source})`, "success");
  },
});

export const saveCreative = mutation({
  args: {
    campaignId: v.id("campaigns"),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    imagePrompt: v.string(),
    caption: v.string(),
    cta: v.string(),
    hashtags: v.array(v.string()),
    postTime: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("linkedin")),
    qcStatus: v.union(v.literal("pass"), v.literal("fail"), v.literal("needs_human")),
    qcReportUrl: v.optional(v.string()),
    source: v.literal("fallback"),
    format: v.union(v.literal("image"), v.literal("video")),
    brandKitId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("creatives", args);
    const qcMsg =
      args.qcStatus === "pass"
        ? `Creative passed QC (${args.source})`
        : `Creative QC: ${args.qcStatus} (${args.source})`;
    await logActivity(ctx, args.campaignId, "creative", qcMsg, args.qcStatus === "pass" ? "success" : "warn");
  },
});

export const overrideQc = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    const creative = await ctx.db
      .query("creatives")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();

    if (creative) {
      await ctx.db.patch(creative._id, { qcStatus: "pass" });
    }

    await ctx.db.patch(args.campaignId, { qcHumanOverride: true, status: "ready_to_post" });

    const platform =
      campaign?.mode === "b2b"
        ? "linkedin"
        : campaign?.platform === "both"
          ? "instagram"
          : campaign?.platform ?? "instagram";

    const existingPost = await ctx.db
      .query("posts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("platform"), platform))
      .first();

    if (!existingPost) {
      await ctx.db.insert("posts", {
        campaignId: args.campaignId,
        platform,
        state: "draft",
      });
    }

    await logActivity(ctx, args.campaignId, "creative", "QC human override — approved for publish", "warn");
  },
});

export const getBrandKit = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) =>
    ctx.db.query("brandKits").withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId)).first(),
});

export const saveProspects = mutation({
  args: {
    campaignId: v.id("campaigns"),
    prospects: v.array(
      v.object({
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
      })
    ),
    isSample: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    for (const p of args.prospects) {
      await ctx.db.insert("prospects", {
        campaignId: args.campaignId,
        name: p.name,
        role: p.role,
        company: p.company,
        linkedinUrl: p.linkedinUrl,
        ...(p.workEmail !== undefined ? { workEmail: p.workEmail } : {}),
        ...(p.phone !== undefined ? { phone: p.phone } : {}),
        companyContext: p.companyContext,
        intentSignal: p.intentSignal,
        ...(p.source !== undefined ? { source: p.source } : {}),
        sourceUrl: p.sourceUrl,
        enrichedAt: now,
      });
    }
    await ctx.db.patch(args.campaignId, { isSampleProspects: args.isSample });
    await logActivity(
      ctx,
      args.campaignId,
      "audience",
      `Enriched ${args.prospects.length} prospects${args.isSample ? " (sample list)" : ""}`,
      args.isSample ? "warn" : "success"
    );
  },
});

export const saveOutreach = mutation({
  args: {
    campaignId: v.id("campaigns"),
    items: v.array(
      v.object({
        prospectLinkedinUrl: v.string(),
        draftMessage: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    for (const item of args.items) {
      const prospect = prospects.find((p) => p.linkedinUrl === item.prospectLinkedinUrl);
      if (!prospect) continue;
      await ctx.db.insert("outreach", {
        campaignId: args.campaignId,
        prospectId: prospect._id,
        platform: "linkedin",
        draftMessage: item.draftMessage,
        state: "draft",
      });
    }
    await logActivity(ctx, args.campaignId, "creative", `Drafted ${args.items.length} personalized outreach messages`, "success");
  },
});

export const createDraftPost = mutation({
  args: {
    campaignId: v.id("campaigns"),
    platform: v.union(v.literal("instagram"), v.literal("linkedin")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (existing) return existing._id;

    await ctx.db.insert("posts", {
      campaignId: args.campaignId,
      platform: args.platform,
      state: "draft",
    });
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});
