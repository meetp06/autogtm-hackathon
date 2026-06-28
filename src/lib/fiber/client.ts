import {
  buildAudience,
  createAudience,
  estimateEnrichmentCost,
  exportProspects,
  getAudienceProspects,
  getAudienceStatus,
  getEnrichmentStatus,
  getOrgCredits,
  getRateLimits,
  listAvailableTrackerRules,
  nlpSearchParse,
  previewTrackerSignal,
  slushieRun,
  triggerEnrichment,
  updateAudienceSearchParams,
} from "@fiberai/sdk";
import type {
  FiberAudienceEstimate,
  FiberAudienceResult,
  FiberIntentResult,
  FiberIntentSignal,
  FiberProspect,
} from "@/lib/fiber/types";

const MAX_PROSPECTS = Number(process.env.FIBER_MAX_PROSPECTS ?? 8);
const POLL_INTERVAL_MS = 30_000;

const SAMPLE_INTENT: FiberIntentSignal[] = [
  {
    text: "Fintech teams hiring outbound SDRs are likely feeling pipeline creation pressure.",
    source_url: "sample://fiber/tracker",
    company: "Sample growth team",
  },
  {
    text: "Series A SaaS companies changing CRM/revops tooling are likely evaluating workflow automation.",
    source_url: "sample://fiber/tracker",
    company: "Sample SaaS account",
  },
];

const SAMPLE_PROSPECTS: FiberProspect[] = [
  {
    name: "Maya Chen",
    role: "VP Growth",
    company: "Northstar Metrics",
    linkedin_url: "sample://fiber/prospect/maya-chen",
    work_email: "sample@example.com",
    phone: "+1 555 0100",
    company_context: "Series A SaaS team scaling outbound and experimenting with agent-led GTM.",
    intent_signal: "Hiring outbound SDRs and testing new revenue workflows.",
    source: "sample",
    source_url: "sample://fiber/prospects",
  },
  {
    name: "Arjun Patel",
    role: "Head of RevOps",
    company: "LedgerLift",
    linkedin_url: "sample://fiber/prospect/arjun-patel",
    work_email: "sample@example.com",
    company_context: "Fintech RevOps leader with CRM hygiene and campaign velocity pain.",
    intent_signal: "Recent CRM migration suggests appetite for pipeline automation.",
    source: "sample",
    source_url: "sample://fiber/prospects",
  },
  {
    name: "Elena Rivera",
    role: "Founder",
    company: "LaunchLoop",
    linkedin_url: "sample://fiber/prospect/elena-rivera",
    company_context: "Founder-led sales motion with limited GTM bandwidth.",
    intent_signal: "Posting about finding repeatable outbound angles.",
    source: "sample",
    source_url: "sample://fiber/prospects",
  },
];

type SdkOptions = Record<string, unknown>;
type SdkFunction = (options: SdkOptions) => Promise<unknown>;
type FiberEnvelope = {
  data?: {
    output?: unknown;
    chargeInfo?: unknown;
  };
  error?: unknown;
};

export class FiberClient {
  constructor(private readonly apiKey?: string) {}

  static fromEnv(): FiberClient {
    return new FiberClient(process.env.FIBER_API_KEY ?? process.env.FIBERAI_API_KEY);
  }

  async getIntentSignals(input: {
    product: string;
    category: string;
    icp: string;
  }): Promise<FiberIntentResult> {
    if (!hasUsableKey(this.apiKey)) {
      return { signals: SAMPLE_INTENT, isSample: true };
    }

    try {
      await this.safeFreeCall(listAvailableTrackerRules as SdkFunction, {
        query: { apiKey: this.apiKey },
      });
      await this.safeFreeCall(previewTrackerSignal as SdkFunction, {
        body: {
          apiKey: this.apiKey,
          config: {
            type: "job_posting_with_keyword",
            keyword: input.product,
          },
        },
      });

      await this.ensureCredits("nlp-search/run");
      const search = await this.call(slushieRun as SdkFunction, {
        body: {
          apiKey: this.apiKey,
          query: `${input.icp} companies showing buying intent for ${input.category}. Include hiring, funding, tech-stack change, or outbound/revenue operations signals.`,
          pageSize: 5,
        },
      });
      const rows = extractRows(search.output);
      const signals = rows.slice(0, 5).map((row) => intentFromRow(row, input.category));

      return {
        signals: signals.length > 0 ? signals : SAMPLE_INTENT,
        isSample: signals.length === 0,
      };
    } catch {
      return { signals: SAMPLE_INTENT, isSample: true };
    }
  }

  async prepareAudience(input: {
    icp: string;
    angleHeadline: string;
    product: string;
  }): Promise<FiberAudienceEstimate> {
    if (!hasUsableKey(this.apiKey)) {
      return this.sampleEstimate(input.icp);
    }

    try {
      await this.safeFreeCall(getRateLimits as SdkFunction, {
        query: { apiKey: this.apiKey },
      });

      const created = await this.call(createAudience as SdkFunction, {
        body: {
          apiKey: this.apiKey,
          name: `AutoGTM - ${input.product} - ${Date.now()}`,
          creationMethod: "NORMAL",
        },
      });
      const createdOutput = asRecord(created.output);
      const fiberAudienceId =
        stringValue(createdOutput.id) ??
        stringValue(createdOutput.audienceId) ??
        stringValue(createdOutput.fiberAudienceId);

      if (!fiberAudienceId) {
        throw new Error("Fiber did not return an audience id");
      }

      await this.ensureCredits("nlp-search/parse");
      const parsed = await this.call(nlpSearchParse as SdkFunction, {
        body: {
          apiKey: this.apiKey,
          query: `${input.icp}. Prioritize buyers likely to care about: ${input.angleHeadline}.`,
        },
      });

      const parsedOutput = asRecord(parsed.output);
      const parsedParams = asRecord(parsedOutput.parsedParams);
      const companySearchParams = parsedParams.companySearchParams ?? parsedOutput.companySearchParams;
      const profileSearchParams = parsedParams.profileSearchParams ?? parsedOutput.profileSearchParams;

      if (!companySearchParams && !profileSearchParams) {
        throw new Error("Fiber could not turn the ICP into search params");
      }

      await this.call(updateAudienceSearchParams as SdkFunction, {
        path: { audienceId: fiberAudienceId },
        body: {
          apiKey: this.apiKey,
          ...(companySearchParams ? { companySearchParams } : {}),
          ...(profileSearchParams ? { profileSearchParams } : {}),
        },
      });

      await this.ensureCredits("audiences/build");
      await this.call(buildAudience as SdkFunction, {
        path: { audienceId: fiberAudienceId },
        body: { apiKey: this.apiKey },
      });

      const audienceStatus = await this.pollAudienceBuild(fiberAudienceId);

      const estimate = await this.call(estimateEnrichmentCost as SdkFunction, {
        path: { audienceId: fiberAudienceId },
        body: enrichmentBody(this.apiKey),
      });
      const estimateOutput = asRecord(estimate.output);
      const listSize =
        deepNumber(audienceStatus, ["prospectCount", "prospectsCount", "profileCount", "profilesCount", "listSize"]) ??
        deepNumber(estimateOutput, ["prospectCount", "prospectsCount", "profileCount", "profilesCount", "listSize"]) ??
        MAX_PROSPECTS;

      return {
        fiberAudienceId,
        query: input.icp,
        estimatedCredits:
          deepNumber(estimateOutput, ["totalCredits", "estimatedCredits", "credits", "totalCostCredits", "cost"]) ?? 0,
        listSize,
        availableCredits: (await this.getCredits()).available,
        chargeInfo: estimate.chargeInfo,
        isSample: false,
      };
    } catch {
      return this.sampleEstimate(input.icp);
    }
  }

  async enrichAudience(input: {
    fiberAudienceId: string;
    estimatedCredits?: number;
  }): Promise<FiberAudienceResult> {
    if (!hasUsableKey(this.apiKey) || input.fiberAudienceId.startsWith("sample://")) {
      return {
        prospects: SAMPLE_PROSPECTS,
        list_size: SAMPLE_PROSPECTS.length,
        estimated_credits: input.estimatedCredits ?? 0,
        isSample: true,
      };
    }

    await this.ensureCredits("audiences/enrich");
    const triggered = await this.call(triggerEnrichment as SdkFunction, {
      path: { audienceId: input.fiberAudienceId },
      body: enrichmentBody(this.apiKey),
    });

    const statusOutput = await this.pollEnrichment(input.fiberAudienceId);

    await this.safeFreeCall(exportProspects as SdkFunction, {
      path: { audienceId: input.fiberAudienceId },
      body: {
        apiKey: this.apiKey,
        format: "PROSPECT_GENERIC_CSV",
        maxRowsToExport: MAX_PROSPECTS,
        onlyWithContacts: false,
      },
    });

    const prospectResponse = await this.call(getAudienceProspects as SdkFunction, {
      path: { audienceId: input.fiberAudienceId },
      query: {
        apiKey: this.apiKey,
        pageSize: MAX_PROSPECTS,
      },
    });

    const rows = [
      ...extractRows(prospectResponse.output),
      ...extractRows(statusOutput),
    ];
    const prospects = dedupeProspects(
      rows
        .map((row) => prospectFromRow(row, input.fiberAudienceId))
        .filter((prospect) => prospect.name && prospect.company && prospect.source_url)
    ).slice(0, MAX_PROSPECTS);

    return {
      prospects: prospects.length > 0 ? prospects : SAMPLE_PROSPECTS,
      list_size: prospects.length > 0 ? prospects.length : SAMPLE_PROSPECTS.length,
      estimated_credits: input.estimatedCredits,
      charge_info: triggered.chargeInfo,
      isSample: prospects.length === 0,
    };
  }

  private async pollAudienceBuild(audienceId: string): Promise<Record<string, unknown>> {
    let lastStatus: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const status = await this.call(getAudienceStatus as SdkFunction, {
        path: { audienceId },
        query: { apiKey: this.apiKey },
      });
      lastStatus = asRecord(status.output);
      const state = stringValue(lastStatus.status)?.toUpperCase();
      if (state === "NORMAL") return lastStatus;
      if (state === "FAILED") throw new Error("Fiber audience build failed");
      if (attempt < 2) await delay(POLL_INTERVAL_MS);
    }
    return lastStatus;
  }

  private async pollEnrichment(audienceId: string): Promise<Record<string, unknown>> {
    let lastStatus: Record<string, unknown> = {};
    await delay(POLL_INTERVAL_MS);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const status = await this.call(getEnrichmentStatus as SdkFunction, {
        path: { audienceId },
        query: { apiKey: this.apiKey },
      });
      lastStatus = asRecord(status.output);
      const state = stringValue(lastStatus.status)?.toLowerCase();
      const done = booleanValue(lastStatus.done);

      if (done || state === "completed" || state === "complete" || state === "done") {
        return lastStatus;
      }
      if (state === "failed" || state === "error") {
        throw new Error("Fiber enrichment failed");
      }
      if (attempt < 5) await delay(POLL_INTERVAL_MS);
    }

    return lastStatus;
  }

  private async getCredits(): Promise<{ available?: number; output: unknown }> {
    const credits = await this.call(getOrgCredits as SdkFunction, {
      query: { apiKey: this.apiKey },
    });
    const output = asRecord(credits.output);
    return {
      available: deepNumber(output, ["available", "availableCredits", "creditsAvailable", "remaining"]),
      output,
    };
  }

  private async ensureCredits(operation: string) {
    const credits = await this.getCredits();
    if (credits.available !== undefined && credits.available <= 0) {
      throw new Error(`Fiber has 0 credits available before ${operation}. Add credits or lower the prospect count.`);
    }
  }

  private async call(fn: SdkFunction, options: SdkOptions) {
    const response = (await fn(options)) as FiberEnvelope;
    if (response.error) {
      throw new Error(fiberErrorMessage(response.error));
    }
    return {
      output: response.data?.output,
      chargeInfo: response.data?.chargeInfo,
    };
  }

  private async safeFreeCall(fn: SdkFunction, options: SdkOptions) {
    try {
      await this.call(fn, options);
    } catch {
      // Free discovery calls are useful but should not block the GTM run.
    }
  }

  private sampleEstimate(query: string): FiberAudienceEstimate {
    return {
      fiberAudienceId: "sample://fiber/audience",
      query,
      estimatedCredits: 0,
      listSize: SAMPLE_PROSPECTS.length,
      isSample: true,
    };
  }
}

function enrichmentBody(apiKey?: string) {
  return {
    apiKey,
    maxProspectsToEnrich: MAX_PROSPECTS,
    enrichmentType: {
      getWorkEmails: true,
      getPersonalEmails: false,
      getPhoneNumbers: true,
    },
    runCompanyLiveEnrichment: true,
    runProfileLiveEnrichment: true,
    runProfileSalesNav: true,
    runContactEnrichment: true,
  };
}

function hasUsableKey(key?: string) {
  return Boolean(key && !/(full_key|new_key|placeholder|your_|here|example)/i.test(key));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function deepNumber(value: unknown, keys: string[], depth = 0): number | undefined {
  if (depth > 4) return undefined;
  const record = asRecord(value);
  for (const key of keys) {
    const direct = numberValue(record[key]);
    if (direct !== undefined) return direct;
  }
  for (const child of Object.values(record)) {
    if (child && typeof child === "object") {
      const found = deepNumber(child, keys, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function extractRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  const candidates = [
    record.data,
    record.rows,
    record.items,
    record.results,
    record.prospects,
    record.profiles,
    record.people,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(asRecord);
  }

  return [];
}

function intentFromRow(row: Record<string, unknown>, category: string): FiberIntentSignal {
  const company =
    stringValue(row.company) ??
    stringValue(row.companyName) ??
    stringValue(asRecord(row.companyDetails).name) ??
    "Fiber account";
  const title = stringValue(row.title) ?? stringValue(row.job_title) ?? stringValue(row.headline);
  const source = stringValue(row.linkedin_url) ?? stringValue(row.profile_url) ?? stringValue(row.company_linkedin_url);

  return {
    text: title
      ? `${company} has a ${title} match that may indicate ${category} demand.`
      : `${company} matched Fiber's intent/audience search for ${category}.`,
    source_url: source ?? "fiber://nlp-search/run",
    company,
  };
}

function prospectFromRow(row: Record<string, unknown>, audienceId: string): FiberProspect {
  const firstName = stringValue(row.first_name) ?? stringValue(row.firstName);
  const lastName = stringValue(row.last_name) ?? stringValue(row.lastName);
  const fullName =
    stringValue(row.full_name) ??
    stringValue(row.fullName) ??
    stringValue(row.name) ??
    [firstName, lastName].filter(Boolean).join(" ");
  const companyRecord = asRecord(row.company);
  const company =
    stringValue(row.company) ??
    stringValue(row.company_name) ??
    stringValue(row.companyName) ??
    stringValue(companyRecord.name) ??
    stringValue(row.currentCompany) ??
    "Fiber company";
  const linkedin =
    stringValue(row.profile_url) ??
    stringValue(row.linkedin_url) ??
    stringValue(row.linkedinUrl) ??
    stringValue(row.public_profile_url) ??
    `fiber://audiences/${audienceId}/prospects`;
  const companyContext = [
    stringValue(row.company_description),
    stringValue(row.company_industries),
    stringValue(row.company_employee_count_upper)
      ? `${stringValue(row.company_employee_count_upper)} employees`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    name: fullName || "Fiber prospect",
    role:
      stringValue(row.job_title) ??
      stringValue(row.jobTitle) ??
      stringValue(row.title) ??
      stringValue(row.headline) ??
      "Buyer",
    company,
    linkedin_url: linkedin,
    work_email:
      stringValue(row.work_email_1) ??
      stringValue(row.workEmail) ??
      stringValue(row.email) ??
      stringValue(row.work_email),
    phone:
      stringValue(row.phone_number_1) ??
      stringValue(row.phoneNumber) ??
      stringValue(row.phone) ??
      stringValue(row.mobilePhone),
    company_context: companyContext || `Matched Fiber audience ${audienceId}.`,
    intent_signal:
      stringValue(row.intent_signal) ??
      stringValue(row.signal) ??
      "Matched ICP and enrichment filters for this campaign.",
    source: "fiber",
    source_url: linkedin,
  };
}

function dedupeProspects(prospects: FiberProspect[]) {
  const seen = new Set<string>();
  return prospects.filter((prospect) => {
    const key = `${prospect.linkedin_url}:${prospect.name}:${prospect.company}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fiberErrorMessage(error: unknown) {
  const record = asRecord(error);
  const message = stringValue(record.message) ?? "Fiber API request failed";
  return message.replace(/(sk|osk|key|fiber)_[A-Za-z0-9_-]+/g, "$1_****");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
