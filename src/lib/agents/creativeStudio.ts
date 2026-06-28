import { buildBrandKit, generateAdImage, verifyAd, type BrandKitResult } from "@/lib/creative";
import { generateStructured, hasOrangeSliceKey } from "@/lib/orangeslice/client";

export type CreativeStudioResult = {
  creative: {
    image_prompt: string;
    caption: string;
    cta: string;
    hashtags: string[];
    post_time: string;
    platform: "instagram" | "linkedin";
  };
  imageBase64: string | null;
  qcStatus: "pass" | "fail" | "needs_human";
  qcReportUrl: string;
  source: "fallback";
  format: "image" | "video";
  brandKitId: string;
};

const CAPTION_SCHEMA = {
  type: "object",
  properties: {
    image_prompt: { type: "string" },
    caption: { type: "string" },
    cta: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    post_time: { type: "string" },
    platform: { type: "string", enum: ["instagram", "linkedin"] },
  },
  required: ["image_prompt", "caption", "cta", "hashtags"],
} as const;

export async function runCreativeStudio(input: {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  angleHeadline: string;
  platform: "instagram" | "linkedin" | "both";
  priceTier: string;
  brandKit?: BrandKitResult;
}): Promise<CreativeStudioResult> {
  const targetPlatform = input.platform === "both" ? "instagram" : input.platform;

  const brandKit =
    input.brandKit ??
    buildBrandKit({
      product: input.product,
      description: input.description,
      audience: input.audience,
      differentiator: input.differentiator,
      angleHeadline: input.angleHeadline,
      priceTier: input.priceTier,
    });

  let caption = `${input.angleHeadline} — built for ${input.audience}. ${input.description}`;
  let cta = "Learn more";
  let hashtags = ["#launch", "#startup", "#marketing"];
  let imagePrompt = `Professional social ad for ${input.product}, angle '${input.angleHeadline}'. ${brandKit.voice}. Style: clean product photography, dramatic lighting, high contrast. Composition: product hero centered, minimalist background, single clear focal point. Color palette: ${brandKit.colors.primary} dominant with ${brandKit.colors.accent ?? "dark"} accents. Mood: confident, premium, modern. Platform: ${targetPlatform}.`;

  // Copy is written by Orange Slice AI; image is rendered by OpenAI gpt-image-1.
  if (hasOrangeSliceKey()) {
    const parsed = await generateStructured<{
      image_prompt?: string;
      caption?: string;
      cta?: string;
      hashtags?: string[];
      post_time?: string;
      platform?: "instagram" | "linkedin";
    }>({
      system: `You are a world-class creative director. Write a ${targetPlatform} caption and a detailed image generation prompt using the brand kit context.

For the image_prompt: Describe the visual in vivid detail — subject, composition, lighting, color palette, mood, and platform-specific framing (portrait for Instagram, landscape for LinkedIn). Direct an AI image model to produce a scroll-stopping, on-brand photo.

Return image_prompt, caption, cta, hashtags[], post_time, platform.`,
      prompt: JSON.stringify({ ...input, brandKit, platform: targetPlatform }),
      schema: CAPTION_SCHEMA,
    });
    caption = parsed.caption ?? caption;
    cta = parsed.cta ?? cta;
    hashtags = parsed.hashtags ?? hashtags;
    imagePrompt = parsed.image_prompt ?? imagePrompt;
  }

  const ad = await generateAdImage({
    brandKit,
    angleHeadline: input.angleHeadline,
    platform: targetPlatform,
    imagePrompt,
  });

  const qc = verifyAd({
    imageBase64: ad.imageBase64,
    platform: targetPlatform,
    product: input.product,
    expectedFormat: ad.format,
  });

  return {
    creative: {
      image_prompt: ad.imagePrompt,
      caption,
      cta,
      hashtags,
      post_time: new Date(Date.now() + 3600000).toISOString(),
      platform: targetPlatform,
    },
    imageBase64: ad.imageBase64,
    qcStatus: qc.qcStatus,
    qcReportUrl: qc.qcReportUrl,
    source: ad.source,
    format: ad.format,
    brandKitId: brandKit.brandKitId,
  };
}
