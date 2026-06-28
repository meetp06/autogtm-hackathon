/**
 * OrangeSliceClient — adapter over the `orangeslice` package (the hackathon host).
 * Orange Slice is the spine of Forge:
 *   - AI reasoning  → generateObject (structured output)
 *   - B2B audience  → oceanSearchPeople over a 1.15B-profile LinkedIn DB
 *   - contacts      → personContactGet (best-effort; needs enrichment credits)
 * Fiber stays responsible only for live Reddit/X/LinkedIn buyer-voice in Market Pulse.
 *
 * Auth: the package resolves `ORANGESLICE_API_KEY` from env automatically. If the
 * key is absent we run in clearly-labeled sample mode; if it is present and a call
 * fails, the error propagates so the pipeline reports an honest failure (no fake data).
 *
 * NOTE: the SDK's TypeScript types are ahead of the live server — only the fields below
 * are accepted by Ocean (verified against the API): peopleFilters.{seniorities,departments,
 * countries} and companiesFilters.{industries,companySizes,countries}. The email/phone
 * search flags in the d.ts are rejected by the server, so contacts come from personContactGet.
 */
import {
  configure,
  generateObject,
  integrations,
  oceanSearchPeople,
  personContactGet,
  webSearch,
} from "orangeslice";
import type { FiberProspect } from "@/lib/fiber/types";
import { withCache, cacheKey } from "@/lib/cache";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export type MarketScrapeChunk = {
  channel: "reddit" | "twitter" | "linkedin";
  source_url: string;
  text: string;
};

export type MarketScrapeResult = {
  chunks: MarketScrapeChunk[];
  text: string;
  sourceCount: number;
  channels: string[];
  isSample: boolean;
};

const MAX_PROSPECTS = Number(process.env.OS_MAX_PROSPECTS ?? process.env.FIBER_MAX_PROSPECTS ?? 8);
const ENRICH_CONTACTS = process.env.OS_ENRICH_CONTACTS !== "false";
// Contact provider(s) for personContactGet. Default to BCR (the default waterfall
// hits Findymail first, which 402s without Findymail credits). Override via env.
const CONTACT_SOURCES = (process.env.OS_CONTACT_SOURCES ?? "bcr")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean) as Array<"bcr">;
const CONTACT_TIMEOUT_MS = Number(process.env.OS_CONTACT_TIMEOUT_MS ?? 12000);

// Exact seniority values the Ocean server accepts.
const SENIORITIES = [
  "Owner",
  "Founder",
  "Board Member",
  "C-Level",
  "Partner",
  "VP",
  "Head",
  "Director",
  "Manager",
  "Other",
] as const;

const COMPANY_SIZES = [
  "0-1",
  "2-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001+",
] as const;

// Exact department values the Ocean server accepts.
const DEPARTMENTS = [
  "Accounting and Finance",
  "Board",
  "Business Support",
  "Customer Relations",
  "Design",
  "Editorial Personnel",
  "Engineering",
  "Founder/Owner",
  "Healthcare",
  "HR",
  "Legal",
  "Management",
  "Manufacturing",
  "Marketing and Advertising",
  "Operations",
  "PR and Communications",
  "Procurement",
  "Product",
  "Quality Control",
  "R&D",
  "Sales",
  "Security",
  "Supply Chain",
  "Other",
] as const;

// Ocean wants lowercase ISO-2 country codes; the AI often emits full names.
const COUNTRY_MAP: Record<string, string> = {
  "united states": "us",
  "united states of america": "us",
  usa: "us",
  america: "us",
  "united kingdom": "gb",
  uk: "gb",
  canada: "ca",
  india: "in",
  germany: "de",
  france: "fr",
  australia: "au",
  spain: "es",
  italy: "it",
  netherlands: "nl",
  ireland: "ie",
  singapore: "sg",
  brazil: "br",
};

function normalizeCountries(arr: string[]): string[] {
  return arr
    .map((c) => {
      const k = c.trim().toLowerCase();
      return COUNTRY_MAP[k] ?? (k.length === 2 ? k : "");
    })
    .filter(Boolean);
}

let configured = false;

export function hasOrangeSliceKey(): boolean {
  const key = process.env.ORANGESLICE_API_KEY?.trim();
  if (!key) return false;
  const templated =
    /^<.*>$/.test(key) || /(your[_-]?key|changeme|placeholder|example_key)/i.test(key);
  return !templated;
}

function ensureConfigured() {
  if (configured) return;
  const apiKey = process.env.ORANGESLICE_API_KEY?.trim();
  if (apiKey) configure({ apiKey });
  configured = true;
}

/**
 * Send an email via the Orange Slice Gmail integration (Composio-backed).
 * Method + payload field names are env-tunable since the Composio action schema
 * may differ per account. Returns {ok,error} — never throws — so the caller can
 * surface the real reason (e.g. Gmail OAuth not completed) to the user.
 */
export async function sendGmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!hasOrangeSliceKey()) return { ok: false, error: "ORANGESLICE_API_KEY not set" };
  ensureConfigured();
  const method = process.env.OS_GMAIL_METHOD ?? "sendEmail";
  const toField = process.env.OS_GMAIL_TO_FIELD ?? "recipient_email";
  try {
    const gmail = integrations.gmail as Record<string, (a: unknown) => Promise<unknown>>;
    await gmail[method]({ [toField]: input.to, subject: input.subject, body: input.body });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gmail send failed" };
  }
}

/** Structured AI output via Orange Slice. Throws if the key is missing — callers gate on hasOrangeSliceKey(). */
export async function generateStructured<T>(input: {
  prompt: string;
  schema: Record<string, unknown>;
  system?: string;
}): Promise<T> {
  if (!hasOrangeSliceKey()) throw new Error("ORANGESLICE_API_KEY not set");
  ensureConfigured();
  const res = await generateObject<T>({
    prompt: input.prompt,
    schema: input.schema,
    system: input.system,
  });
  return res.object;
}

type PeopleFilters = { seniorities?: string[]; departments?: string[]; countries?: string[] };
type CompaniesFilters = { industries?: string[]; companySizes?: string[]; countries?: string[] };
export type AudienceFilters = { peopleFilters: PeopleFilters; companiesFilters: CompaniesFilters };

const FILTER_SCHEMA = {
  type: "object",
  properties: {
    peopleFilters: {
      type: "object",
      properties: {
        seniorities: { type: "array", items: { type: "string", enum: [...SENIORITIES] } },
        departments: { type: "array", items: { type: "string", enum: [...DEPARTMENTS] } },
        countries: { type: "array", items: { type: "string" } },
      },
    },
    companiesFilters: {
      type: "object",
      properties: {
        industries: { type: "array", items: { type: "string" } },
        companySizes: { type: "array", items: { type: "string", enum: [...COMPANY_SIZES] } },
        countries: { type: "array", items: { type: "string" } },
      },
    },
  },
  required: ["peopleFilters", "companiesFilters"],
} as const;

function pruneFilters(f: AudienceFilters): {
  peopleFilters?: PeopleFilters;
  companiesFilters?: CompaniesFilters;
} {
  const people: PeopleFilters = {};
  if (f.peopleFilters?.seniorities?.length) {
    const v = f.peopleFilters.seniorities.filter((s) => SENIORITIES.includes(s as never));
    if (v.length) people.seniorities = v;
  }
  if (f.peopleFilters?.departments?.length) {
    const v = f.peopleFilters.departments.filter((d) => DEPARTMENTS.includes(d as never));
    if (v.length) people.departments = v;
  }
  if (f.peopleFilters?.countries?.length) {
    const v = normalizeCountries(f.peopleFilters.countries);
    if (v.length) people.countries = v;
  }

  const companies: CompaniesFilters = {};
  if (f.companiesFilters?.industries?.length) companies.industries = f.companiesFilters.industries;
  if (f.companiesFilters?.companySizes?.length) {
    const v = f.companiesFilters.companySizes.filter((s) => COMPANY_SIZES.includes(s as never));
    if (v.length) companies.companySizes = v;
  }
  if (f.companiesFilters?.countries?.length) {
    const v = normalizeCountries(f.companiesFilters.countries);
    if (v.length) companies.countries = v;
  }

  const out: { peopleFilters?: PeopleFilters; companiesFilters?: CompaniesFilters } = {};
  if (Object.keys(people).length) out.peopleFilters = people;
  if (Object.keys(companies).length) out.companiesFilters = companies;
  // Ocean rejects an entirely-empty body; default to a broad seniority set.
  if (!out.peopleFilters && !out.companiesFilters) {
    out.peopleFilters = { seniorities: ["C-Level", "VP", "Director"] };
  }
  return out;
}

export class OrangeSliceClient {
  isConfigured(): boolean {
    return hasOrangeSliceKey();
  }

  /**
   * Pull real buyer-voice signals from Reddit, Twitter/X and LinkedIn via Orange Slice webSearch.
   * Returns scraped result snippets (each tagged with its real source URL) for the Market Pulse
   * agent to extract from. Key present + total failure → error propagates (no fabricated data).
   */
  async scrapeMarketSignals(input: {
    product: string;
    description: string;
    differentiator: string;
  }): Promise<MarketScrapeResult> {
    if (!hasOrangeSliceKey()) {
      return { chunks: [], text: "", sourceCount: 0, channels: [], isSample: true };
    }
    return withCache(
      cacheKey("os-market", {
        product: input.product,
        description: input.description,
        differentiator: input.differentiator,
      }),
      SIX_HOURS,
      () => this.scrapeMarketSignalsUncached(input)
    );
  }

  private async scrapeMarketSignalsUncached(input: {
    product: string;
    description: string;
    differentiator: string;
  }): Promise<MarketScrapeResult> {
    ensureConfigured();

    const product = input.product.trim();
    const queries: Array<{ channel: MarketScrapeChunk["channel"]; query: string }> = [
      { channel: "reddit", query: `${product} ${input.description} review OR complaint OR alternative OR switching site:reddit.com` },
      { channel: "twitter", query: `${product} frustrated OR alternative OR switching OR love (site:x.com OR site:twitter.com)` },
      { channel: "linkedin", query: `${product} ${input.differentiator} site:linkedin.com/posts` },
    ];

    const settled = await Promise.allSettled(
      queries.map(async ({ channel, query }) => {
        const res = await webSearch({ query });
        return (res.results ?? []).slice(0, 5).map((r) => ({
          channel,
          source_url: r.link,
          text: [r.title, r.snippet].filter(Boolean).join(" — "),
        }));
      })
    );

    const chunks: MarketScrapeChunk[] = [];
    let anyOk = false;
    for (const s of settled) {
      if (s.status === "fulfilled") {
        anyOk = true;
        chunks.push(...s.value);
      }
    }
    if (!anyOk) {
      const firstErr = settled.find((s): s is PromiseRejectedResult => s.status === "rejected");
      throw new Error(
        firstErr?.reason instanceof Error ? firstErr.reason.message : "Orange Slice market search failed"
      );
    }

    const trimmed = chunks.filter((c) => c.text && c.source_url).slice(0, 12);
    const text = trimmed
      .map((c) => `SOURCE (${c.channel}): ${c.source_url}\n${c.text.slice(0, 1000)}`)
      .join("\n\n---\n\n");
    return {
      chunks: trimmed,
      text,
      sourceCount: trimmed.length,
      channels: Array.from(new Set(trimmed.map((c) => c.channel))),
      isSample: trimmed.length === 0,
    };
  }

  /** Turn a plain-English ICP into structured Ocean search filters using OS AI. */
  async parseIcpToFilters(input: { icp: string; angleHeadline: string }): Promise<AudienceFilters> {
    const filters = await generateStructured<AudienceFilters>({
      system:
        "Convert a B2B ideal-customer-profile into Ocean search filters. " +
        `peopleFilters.seniorities MUST use ONLY these exact values: ${SENIORITIES.join(", ")}. ` +
        `peopleFilters.departments MUST use ONLY these exact values: ${DEPARTMENTS.join(", ")}. ` +
        "countries MUST be lowercase ISO-2 codes (e.g. 'us', not 'United States'). " +
        `companiesFilters.companySizes MUST be buckets from: ${COMPANY_SIZES.join(", ")}. ` +
        "companiesFilters.industries are free text. Only include fields you can justify from the ICP; leave the rest empty.",
      prompt: JSON.stringify({ icp: input.icp, marketing_angle: input.angleHeadline }),
      schema: FILTER_SCHEMA,
    });
    return {
      peopleFilters: filters.peopleFilters ?? {},
      companiesFilters: filters.companiesFilters ?? {},
    };
  }

  /**
   * Preview audience size for an ICP. Returns total match count + the encoded WORKING
   * filters for enrichment. AI-emitted free-text filters (e.g. industries like "Fintech")
   * often don't match Ocean's taxonomy and zero out the result, so we progressively relax
   * filters until matches appear — guaranteeing a real audience whenever one exists.
   */
  async previewAudience(input: { icp: string; angleHeadline: string }): Promise<{
    audienceRef: string;
    listSize: number;
    total: number;
  }> {
    return withCache(
      cacheKey("os-audience", { icp: input.icp, angle: input.angleHeadline, max: MAX_PROSPECTS }),
      SIX_HOURS,
      async () => {
        const filters = await this.parseIcpToFilters(input);
        const pruned = pruneFilters(filters);
        ensureConfigured();
        const { params, total } = await findWorkingFilters(pruned);
        return {
          audienceRef: `os:${Buffer.from(JSON.stringify(params)).toString("base64")}`,
          listSize: Math.min(total, MAX_PROSPECTS),
          total,
        };
      }
    );
  }

  /** Pull real prospects for the encoded audience; best-effort contact enrichment on top. */
  async enrichAudience(audienceRef: string): Promise<FiberProspect[]> {
    return withCache(cacheKey("os-enrich", { audienceRef, max: MAX_PROSPECTS }), ONE_DAY, () =>
      this.enrichAudienceUncached(audienceRef)
    );
  }

  private async enrichAudienceUncached(audienceRef: string): Promise<FiberProspect[]> {
    const pruned = decodeAudienceRef(audienceRef);
    ensureConfigured();
    const res = await oceanSearchPeople({
      ...pruned,
      size: MAX_PROSPECTS,
    } as Parameters<typeof oceanSearchPeople>[0]);

    const prospects: FiberProspect[] = res.people.slice(0, MAX_PROSPECTS).map((p) => {
      const name = p.name ?? [p.firstName, p.lastName].filter(Boolean).join(" ") ?? "Prospect";
      const linkedinUrl = p.linkedinUrl ?? `orangeslice://ocean/person/${p.id}`;
      const company = p.company?.name ?? p.domain ?? "Unknown company";
      const role = p.jobTitle ?? "Buyer";
      const intent =
        p.currentJobDescription ??
        (p as { headline?: string }).headline ??
        (p.seniorities?.length ? `Seniority match: ${p.seniorities.join(", ")}` : "Matched ICP filters");
      return {
        name: name || "Prospect",
        role,
        company,
        linkedin_url: linkedinUrl,
        work_email: undefined,
        phone: undefined,
        company_context: [company, p.location].filter(Boolean).join(" · "),
        intent_signal: intent,
        source: "orangeslice",
        source_url: linkedinUrl,
      };
    });

    // Best-effort: pull real work emails. Each call is time-boxed, and we bail out
    // after a credit error or two consecutive failures so a dead/credit-less provider
    // can never stall the run for minutes. Never fabricates contacts.
    if (ENRICH_CONTACTS) {
      let consecutiveFailures = 0;
      for (const prospect of prospects) {
        if (prospect.linkedin_url.startsWith("orangeslice://")) continue;
        try {
          const contact = await withTimeout(
            personContactGet({
              linkedinUrl: prospect.linkedin_url,
              required: ["work_email"],
              sources: CONTACT_SOURCES,
            }),
            CONTACT_TIMEOUT_MS
          );
          prospect.work_email = contact.work_emails?.[0] ?? prospect.work_email;
          prospect.phone = contact.work_phones?.[0] ?? prospect.phone;
          consecutiveFailures = 0;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[orangeslice] contact enrichment skipped:", msg);
          // Credits exhausted / auth → no point trying the rest.
          if (/402|credit|insufficient|unauthor/i.test(msg)) break;
          // Transient/timeout failures: stop after two in a row.
          if (++consecutiveFailures >= 2) break;
        }
      }
    }

    return prospects;
  }
}

type OceanParams = { peopleFilters?: PeopleFilters; companiesFilters?: CompaniesFilters };

/** Ordered, progressively-relaxed filter variants — most specific first. */
function relaxations(pruned: OceanParams): OceanParams[] {
  const out: OceanParams[] = [pruned];

  if (pruned.companiesFilters?.industries) {
    const rest: CompaniesFilters = { ...pruned.companiesFilters };
    delete rest.industries;
    out.push({
      peopleFilters: pruned.peopleFilters,
      companiesFilters: Object.keys(rest).length ? rest : undefined,
    });
  }
  if (pruned.companiesFilters) {
    out.push({ peopleFilters: pruned.peopleFilters });
  }
  if (pruned.peopleFilters?.countries) {
    const rest: PeopleFilters = { ...pruned.peopleFilters };
    delete rest.countries;
    out.push({ peopleFilters: rest });
  }
  if (pruned.peopleFilters?.seniorities) {
    out.push({ peopleFilters: { seniorities: pruned.peopleFilters.seniorities } });
  }

  // Drop empty variants and exact duplicates.
  const seen = new Set<string>();
  return out
    .filter((p) => p.peopleFilters || p.companiesFilters)
    .filter((p) => {
      const k = JSON.stringify(p);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

async function findWorkingFilters(pruned: OceanParams): Promise<{ params: OceanParams; total: number }> {
  const variants = relaxations(pruned);
  let last: { params: OceanParams; total: number } = { params: variants[0] ?? pruned, total: 0 };
  for (const params of variants) {
    const res = await oceanSearchPeople({
      ...params,
      size: 5,
    } as Parameters<typeof oceanSearchPeople>[0]);
    const total = res.total ?? res.people.length;
    last = { params, total };
    if (total > 0) return last;
  }
  return last;
}

/** Reject a promise if it doesn't settle within `ms` — bounds slow provider calls. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

function decodeAudienceRef(ref: string): {
  peopleFilters?: PeopleFilters;
  companiesFilters?: CompaniesFilters;
} {
  if (ref.startsWith("os:")) {
    try {
      return JSON.parse(Buffer.from(ref.slice(3), "base64").toString("utf8"));
    } catch {
      // fall through
    }
  }
  return { peopleFilters: { seniorities: ["C-Level", "VP", "Director"] } };
}
