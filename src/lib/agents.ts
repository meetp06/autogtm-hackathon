import OpenAI from "openai";
import FirecrawlApp from "@mendable/firecrawl-js";
import { FiberClient } from "@/lib/fiber/client";
import { GooseworksClient } from "@/lib/gooseworks/client";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export type MarketPulseOutput = {
  competitors: string[];
  reviews_scanned: number;
  why_buy: Array<{ text: string; source_url: string; competitor: string }>;
  why_not: Array<{ text: string; source_url: string; competitor: string }>;
  buying_intent?: Array<{ text: string; source_url: string; company: string }>;
  creative_gaps?: Array<{ text: string; source_url: string; competitor: string }>;
  quotes: Array<{ text: string; source_url: string }>;
};

const SAMPLE_MARKET: MarketPulseOutput = {
  competitors: ["Category leaders"],
  reviews_scanned: 0,
  why_buy: [
    { text: "Fast setup and clear onboarding", source_url: "sample://insights", competitor: "Category" },
    { text: "Reliable daily performance", source_url: "sample://insights", competitor: "Category" },
  ],
  why_not: [
    { text: "Generic messaging that misses buyer intent", source_url: "sample://insights", competitor: "Category" },
    { text: "Poor mobile experience at checkout", source_url: "sample://insights", competitor: "Category" },
  ],
  quotes: [{ text: "I wanted something that just works.", source_url: "sample://insights" }],
};

export async function runMarketPulse(input: {
  product: string;
  description: string;
  audience: string;
  differentiator: string;
  mode?: "b2c" | "b2b";
  icp?: string;
}) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  let scraped = "";
  let isSample = true;

  if (apiKey) {
    try {
      const firecrawl = new FirecrawlApp({ apiKey });
      const search = await firecrawl.search(`${input.product} ${input.description} reviews`, { limit: 3 });
      const results = search.web ?? [];
      const urls = results
        .map((r) => ("url" in r ? r.url : undefined))
        .filter((u): u is string => Boolean(u))
        .slice(0, 3);
      const chunks: string[] = [];
      for (const url of urls) {
        const page = await firecrawl.scrape(url, { formats: ["markdown"] });
        const md = "markdown" in page ? (page.markdown ?? "") : "";
        chunks.push(`SOURCE: ${url}\n${md.slice(0, 4000)}`);
      }
      scraped = chunks.join("\n\n---\n\n");
      isSample = chunks.length === 0;
    } catch {
      isSample = true;
    }
  }

  if (!process.env.OPENAI_API_KEY || isSample || !scraped) {
    const output = { ...SAMPLE_MARKET };
    if (input.mode === "b2b") {
      const intent = await FiberClient.fromEnv().getIntentSignals({
        product: input.product,
        category: input.description,
        icp: input.icp ?? input.audience,
      });
      output.buying_intent = intent.signals.map((s) => ({
        text: s.text,
        source_url: s.source_url,
        company: s.company,
      }));
    }
    const creativeWatch = await new GooseworksClient().watchCompetitorCreatives({
      product: input.product,
      competitors: output.competitors ?? ["Category leaders"],
    });
    output.creative_gaps = creativeWatch.gaps;
    return { output, isSample: true };
  }

  const openai = getOpenAI();
  if (!openai) {
    const output = { ...SAMPLE_MARKET };
    if (input.mode === "b2b") {
      const intent = await FiberClient.fromEnv().getIntentSignals({
        product: input.product,
        category: input.description,
        icp: input.icp ?? input.audience,
      });
      output.buying_intent = intent.signals.map((s) => ({
        text: s.text,
        source_url: s.source_url,
        company: s.company,
      }));
    }
    const creativeWatch = await new GooseworksClient().watchCompetitorCreatives({
      product: input.product,
      competitors: output.competitors ?? ["Category leaders"],
    });
    output.creative_gaps = creativeWatch.gaps;
    return { output, isSample: true };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Extract why_buy and why_not from scraped text. Cite source_url for each. Return JSON: { competitors[], reviews_scanned, why_buy[{text,source_url,competitor}], why_not[{text,source_url,competitor}], quotes[{text,source_url}] }',
      },
      {
        role: "user",
        content: JSON.stringify({ ...input, scraped }),
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as MarketPulseOutput;

  if (input.mode === "b2b") {
    const intent = await FiberClient.fromEnv().getIntentSignals({
      product: input.product,
      category: input.description,
      icp: input.icp ?? input.audience,
    });
    parsed.buying_intent = intent.signals.map((s) => ({
      text: s.text,
      source_url: s.source_url,
      company: s.company,
    }));
  }

  const creativeWatch = await new GooseworksClient().watchCompetitorCreatives({
    product: input.product,
    competitors: parsed.competitors ?? [input.product],
    angleHeadline: undefined,
  });
  parsed.creative_gaps = creativeWatch.gaps;

  return {
    output: parsed,
    isSample: false,
  };
}

export async function runDemandGap(input: {
  product: string;
  differentiator: string;
  signals: Array<{ type: string; text: string; sourceUrl: string; competitor: string }>;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      gap: "Buyers want proof before promise.",
      angle_headline: "Proof Before Promise",
      supporting_reason: "Lead with the outcome your differentiator guarantees.",
      target_emotion: "confidence",
    };
  }

  const openai = getOpenAI();
  if (!openai) {
    return {
      gap: "Buyers want proof before promise.",
      angle_headline: "Proof Before Promise",
      supporting_reason: "Lead with the outcome your differentiator guarantees.",
      target_emotion: "confidence",
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Identify the single highest-leverage gap. Return JSON: { gap, angle_headline (max 6 words), supporting_reason, target_emotion }",
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  });

  return JSON.parse(response.choices[0]?.message?.content ?? "{}") as {
    gap: string;
    angle_headline: string;
    supporting_reason: string;
    target_emotion: string;
  };
}

export async function runPersonalizedOutreach(input: {
  product: string;
  angleHeadline: string;
  differentiator: string;
  prospects: Array<{
    name: string;
    role: string;
    company: string;
    companyContext: string;
    intentSignal: string;
    linkedinUrl: string;
  }>;
}) {
  const drafts: Array<{ prospectLinkedinUrl: string; draftMessage: string }> = [];

  const openai = getOpenAI();
  if (!openai) {
    for (const p of input.prospects) {
      drafts.push({
        prospectLinkedinUrl: p.linkedinUrl,
        draftMessage: `Hi ${p.name.split(" ")[0]},\n\nSaw ${p.intentSignal.toLowerCase()} at ${p.company}. We help ${p.role}s with ${input.angleHeadline} — ${input.differentiator}.\n\nWorth a 10-min look?\n\n— [Your name]`,
      });
    }
    return drafts;
  }

  for (const p of input.prospects.slice(0, 8)) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Write a short LinkedIn outreach message (under 120 words). Personalize using prospect enrichment. Lead with their intent signal. End with a soft CTA. No spam. Return only the message text.",
        },
        {
          role: "user",
          content: JSON.stringify({
            product: input.product,
            angle: input.angleHeadline,
            differentiator: input.differentiator,
            prospect: p,
          }),
        },
      ],
    });
    drafts.push({
      prospectLinkedinUrl: p.linkedinUrl,
      draftMessage: response.choices[0]?.message?.content?.trim() ?? "",
    });
  }

  return drafts;
}
