"use client";

import { useMemo, useState } from "react";
import { B2B_DEFAULT, B2C_DEFAULT, CRUITICAL_DEMO, IntakeData, Platform, PriceTier } from "@/lib/types";

type Props = {
  data: IntakeData;
  onChange: (data: IntakeData) => void;
  onNext: () => void;
};

type BriefRequirement = {
  key: keyof Pick<IntakeData, "product" | "description" | "audience" | "differentiator">;
  label: string;
  helper: string;
  met: boolean;
};

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasEnoughDetail(value: string, minWords: number, minChars: number) {
  const trimmed = value.trim();
  return trimmed.length >= minChars && countWords(trimmed) >= minWords;
}

function getBriefRequirements(data: IntakeData): BriefRequirement[] {
  const buyerLabel = data.mode === "b2b" ? "Target buyers" : "Target audience";

  return [
    {
      key: "product",
      label: "Product name",
      helper: "Name the product or offer.",
      met: data.product.trim().length >= 2,
    },
    {
      key: "description",
      label: "What it does",
      helper: "Write one specific sentence with the problem, outcome, or use case.",
      met: hasEnoughDetail(data.description, 7, 42),
    },
    {
      key: "audience",
      label: buyerLabel,
      helper:
        data.mode === "b2b"
          ? "Name a role, company stage or type, and buying situation."
          : "Name the buyer segment and the moment they would want this.",
      met: hasEnoughDetail(data.audience, 5, 28),
    },
    {
      key: "differentiator",
      label: "Why this wins",
      helper: "Explain the strongest advantage, proof point, or urgency.",
      met: hasEnoughDetail(data.differentiator, 5, 32),
    },
  ];
}

function getNextMissingRequirement(requirements: BriefRequirement[]) {
  return requirements.find((requirement) => !requirement.met);
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function inferPlatform(data: IntakeData): Platform {
  if (data.mode === "b2b") return "linkedin";

  const text = `${data.product} ${data.description} ${data.audience} ${data.differentiator}`.toLowerCase();
  const professionalSignals = [
    "b2b",
    "business",
    "company",
    "enterprise",
    "founder",
    "linkedin",
    "sales",
    "smb",
    "team",
  ];
  const visualSignals = [
    "beauty",
    "consumer",
    "drink",
    "fitness",
    "food",
    "home",
    "instagram",
    "parent",
    "style",
    "wearable",
  ];

  const professional = includesAny(text, professionalSignals);
  const visual = includesAny(text, visualSignals);

  if (professional && visual) return "both";
  if (professional) return "linkedin";
  return "instagram";
}

function inferPriceTier(data: IntakeData): PriceTier {
  const text = `${data.product} ${data.description} ${data.audience} ${data.differentiator}`.toLowerCase();

  if (
    data.mode === "b2b" ||
    includesAny(text, ["enterprise", "executive", "compliance", "revenue", "vp ", "cto", "series a", "premium"])
  ) {
    return "premium";
  }

  if (includesAny(text, ["student", "budget", "free", "discount", "mass market", "low cost"])) {
    return "budget";
  }

  return "mid";
}

function applyExpertJudgment(data: IntakeData): IntakeData {
  return {
    ...data,
    audience:
      data.audience.trim() ||
      (data.mode === "b2b"
        ? "Revenue leaders at growing software companies with urgent pipeline goals"
        : "Motivated buyers who feel the problem now and can act this week"),
    differentiator:
      data.differentiator.trim() ||
      "Clearer outcome, faster time to value, and lower execution effort than the default alternative",
    platform: inferPlatform(data),
    priceTier: inferPriceTier(data),
  };
}

export function IntakeView({ data, onChange, onNext }: Props) {
  const requirements = getBriefRequirements(data);
  const missingRequirements = requirements.filter((requirement) => !requirement.met);
  const nextMissingRequirement = getNextMissingRequirement(requirements);
  const canContinue = missingRequirements.length === 0;
  const shouldAskAudience = requirements[0].met && requirements[1].met;
  const shouldAskDifferentiator = shouldAskAudience && requirements[2].met;

  function setMode(mode: "b2c" | "b2b") {
    if (mode === "b2b") {
      onChange({ ...B2B_DEFAULT, mode: "b2b" });
    } else {
      onChange({ ...B2C_DEFAULT, mode: "b2c" });
    }
  }

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
      <section className="space-y-7">
        <header className="space-y-4">
          <div className="h-20 w-20 rounded-full dot-sun agent-pulse" />
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--accent-text)]">Forge</p>
          <div className="space-y-3">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Launch while the market is still talking.
            </h1>
            <p className="max-w-lg text-base text-[var(--muted)]">
              Forge finds live buyer pain, locks the angle, and stages campaign assets for your approval.
            </p>
          </div>
        </header>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] p-4 sm:p-5 space-y-4">
          <div className="grid gap-2 rounded-full border border-[var(--border)] bg-[var(--field)] p-1 sm:grid-cols-2">
            <button
              onClick={() => setMode("b2b")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                data.mode === "b2b" ? "bg-[var(--orange)] text-[var(--accent-ink)]" : "text-[var(--muted)]"
              }`}
            >
              Buyer outreach
            </button>
            <button
              onClick={() => setMode("b2c")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                data.mode === "b2c" ? "bg-[var(--orange)] text-[var(--accent-ink)]" : "text-[var(--muted)]"
              }`}
            >
              Social campaign
            </button>
          </div>

          <button
            onClick={() => onChange(CRUITICAL_DEMO)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--sand)] px-4 py-3 text-left text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--orange)]"
          >
            Use judge demo: Cruitical
            <span className="block pt-1 text-xs font-normal text-[var(--muted)]">
              Virtual work trials for screening software engineers.
            </span>
          </button>

          <label className="block space-y-2">
            <span className="mono text-xs text-[var(--faint)]">PRODUCT NAME</span>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--field)] px-4 py-3 text-sm outline-none focus:border-[var(--orange)]"
              placeholder={data.mode === "b2b" ? "e.g. Cruitical" : "e.g. VitalCoach"}
              value={data.product}
              onChange={(e) => onChange({ ...data, product: e.target.value })}
            />
          </label>

          <label className="block space-y-2">
            <span className="mono text-xs text-[var(--faint)]">ONE-LINE DESCRIPTION</span>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--field)] px-4 py-3 text-sm outline-none focus:border-[var(--orange)] min-h-[88px]"
              placeholder={
                data.mode === "b2b"
                  ? "Automated virtual work trials for screening software engineers"
                  : "AI health coach that turns wearable data into daily actions"
              }
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
            />
          </label>

          {shouldAskAudience && (
            <label className="block space-y-2">
              <span className="mono text-xs text-[var(--faint)]">
                {data.mode === "b2b" ? "TARGET BUYERS" : "TARGET AUDIENCE"}
              </span>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--field)] px-4 py-3 text-sm outline-none focus:border-[var(--orange)]"
                placeholder={
                  data.mode === "b2b"
                    ? "e.g. VP Growth at Series A-B SaaS teams scaling outbound"
                    : "e.g. Busy parents buying a health coach after a wearable alert"
                }
                value={data.audience}
                onChange={(e) => onChange({ ...data, audience: e.target.value })}
              />
            </label>
          )}

          {shouldAskDifferentiator && (
            <label className="block space-y-2">
              <span className="mono text-xs text-[var(--faint)]">KEY ADVANTAGE</span>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--field)] px-4 py-3 text-sm outline-none focus:border-[var(--orange)]"
                placeholder={
                  data.mode === "b2b"
                    ? "e.g. Cuts research, angle, and outreach drafting into one approved workflow"
                    : "e.g. Calls the user before a missed habit becomes a health setback"
                }
                value={data.differentiator}
                onChange={(e) => onChange({ ...data, differentiator: e.target.value })}
              />
            </label>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--field)] p-4" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="mono text-xs text-[var(--faint)]">BRIEF READINESS</p>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {canContinue
                    ? "Enough context to continue."
                    : `Need ${missingRequirements.length} more ${
                        missingRequirements.length === 1 ? "detail" : "details"
                      }.`}
                </p>
              </div>
              <span className="rounded-full bg-[var(--sand)] px-3 py-1 text-xs font-semibold text-[var(--accent-text)]">
                {requirements.length - missingRequirements.length}/{requirements.length}
              </span>
            </div>
            {!canContinue && nextMissingRequirement && (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Next: {nextMissingRequirement.helper}
              </p>
            )}
            <div className="mt-4 grid gap-2">
              {requirements.map((requirement) => (
                <div key={requirement.key} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                      requirement.met
                        ? "border-[var(--orange)] bg-[var(--orange)] text-[var(--accent-ink)]"
                        : "border-[var(--border)] bg-[var(--panel)]"
                    }`}
                  >
                    {requirement.met ? "✓" : ""}
                  </span>
                  <span>
                    <span className="font-semibold text-[var(--ink)]">{requirement.label}</span>
                    {!requirement.met && ` - ${requirement.helper}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={!canContinue}
            onClick={onNext}
            className="w-full lex-pill px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-40 hover:brightness-110 transition"
          >
            {canContinue ? "Forge campaign →" : "Answer more details"}
          </button>
        </div>
      </section>

      <PipelinePreview mode={data.mode} product={data.product} />
    </div>
  );
}

function PipelinePreview({ mode, product }: { mode: "b2b" | "b2c"; product: string }) {
  const target = product.trim() || "your startup";
  const steps = mode === "b2b"
    ? [
        ["Signal", "Find hiring pain and competitor complaints"],
        ["Angle", "Lock the strongest buyer narrative"],
        ["Audience", "Estimate and enrich real prospects"],
        ["Ready", "Stage LinkedIn post + outreach drafts"],
      ]
    : [
        ["Signal", "Read Reddit, X, and LinkedIn market voice"],
        ["Angle", "Choose the demand gap worth posting"],
        ["Creative", "Generate caption and ad visual"],
        ["Ready", "Stage the post for human approval"],
      ];

  return (
    <aside className="rounded-3xl border border-[var(--border)] bg-[var(--glass-softer)] p-5 shadow-[var(--shadow-md)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mono text-xs text-[var(--accent-text)]">Live campaign path</p>
          <h2 className="mt-2 text-2xl font-semibold">{target}</h2>
        </div>
        <span className="rounded-full bg-[var(--sand)] px-3 py-1 text-xs font-semibold text-[var(--accent-text)]">
          Human approved
        </span>
      </div>
      <div className="space-y-3">
        {steps.map(([label, detail], index) => (
          <div key={label} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--field)] p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--sand)] text-xs font-bold text-[var(--accent-text)]">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-sm text-[var(--muted)]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <p className="text-sm font-semibold">Judge takeaway</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          This is not copy generation. It is a sourced state machine from market signal to approved distribution.
        </p>
      </div>
    </aside>
  );
}

type FollowUpProps = {
  data: IntakeData;
  onChange: (data: IntakeData) => void;
  onLaunch: (data?: IntakeData) => void;
  loading?: boolean;
};

const B2C_AUDIENCE_CHIPS = [
  "Founders testing GTM tools before launch",
  "Consumers replacing a frustrating daily routine",
  "SMB teams trying to reduce manual work",
  "Enterprise buyers comparing high-trust vendors",
];
const B2B_ICP_CHIPS = [
  "VP Growth at Series A SaaS teams scaling outbound",
  "RevOps leaders at fintech companies modernizing pipeline",
  "Founders at B2B startups building repeatable sales",
  "Heads of Sales at dev tools companies expanding pipeline",
];
const PLATFORM_CHIPS: { label: string; value: Platform }[] = [
  { label: "Instagram", value: "instagram" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Both", value: "both" },
];
const TIER_CHIPS: { label: string; value: PriceTier }[] = [
  { label: "Budget", value: "budget" },
  { label: "Mid", value: "mid" },
  { label: "Premium", value: "premium" },
];

export function FollowUpView({ data, onChange, onLaunch, loading }: FollowUpProps) {
  const [useExpertJudgment, setUseExpertJudgment] = useState(true);
  const isB2B = data.mode === "b2b";
  const expertData = useMemo(() => applyExpertJudgment(data), [data]);
  const visibleData = useExpertJudgment ? expertData : data;
  const missingRequirements = getBriefRequirements(visibleData).filter((requirement) => !requirement.met);
  const canLaunch = missingRequirements.length === 0;

  function updateManually(nextData: IntakeData) {
    setUseExpertJudgment(false);
    onChange(nextData);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Campaign qualifiers</h2>
      <p className="text-sm text-[var(--muted)]">
        {isB2B
          ? "Let Forge pick the buyer path from the brief, or take manual control."
          : "Let Forge pick the channel and buying context from the brief, or take manual control."}
      </p>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="mono text-xs text-[var(--faint)]">SETUP MODE</p>
            <p className="text-sm font-semibold text-[var(--ink)]">
              {useExpertJudgment ? "Auto-selected with 30-year GTM judgment." : "Manual selections enabled."}
            </p>
          </div>
          <div className="flex rounded-full border border-[var(--border)] bg-[var(--field)] p-1">
            <button
              type="button"
              onClick={() => setUseExpertJudgment(true)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                useExpertJudgment ? "bg-[var(--orange)] text-[var(--accent-ink)]" : "text-[var(--muted)]"
              }`}
            >
              Expert
            </button>
            <button
              type="button"
              onClick={() => setUseExpertJudgment(false)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                !useExpertJudgment ? "bg-[var(--orange)] text-[var(--accent-ink)]" : "text-[var(--muted)]"
              }`}
            >
              Manual
            </button>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
          <p>
            <span className="font-semibold text-[var(--ink)]">Channel:</span>{" "}
            {expertData.platform === "both" ? "Instagram + LinkedIn" : expertData.platform}
          </p>
          <p>
            <span className="font-semibold text-[var(--ink)]">Buying context:</span> {expertData.priceTier}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="mono text-xs text-[var(--faint)]">
          {isB2B ? "IDEAL BUYER (ICP) — PLAIN ENGLISH" : "WHO IS IT FOR?"}
        </p>
        <div className="flex flex-wrap gap-2">
          {(isB2B ? B2B_ICP_CHIPS : B2C_AUDIENCE_CHIPS).map((chip) => (
            <button
              key={chip}
              onClick={() =>
                updateManually({ ...visibleData, audience: chip, platform: isB2B ? "linkedin" : visibleData.platform })
              }
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                visibleData.audience === chip
                  ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--accent-text)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] px-3 py-2 text-sm"
          placeholder={isB2B ? "e.g. VP Growth at Series A–B SaaS scaling outbound" : "Or type custom audience"}
          value={visibleData.audience}
          onChange={(e) => updateManually({ ...visibleData, audience: e.target.value })}
        />
      </section>

      <section className="space-y-3">
        <p className="mono text-xs text-[var(--faint)]">ONE DIFFERENTIATOR</p>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] px-3 py-2 text-sm"
          placeholder={
            isB2B
              ? "e.g. Collapses research → angle → post in under 2 minutes"
              : "e.g. Only coach that calls you when vitals drift"
          }
          value={visibleData.differentiator}
          onChange={(e) => updateManually({ ...visibleData, differentiator: e.target.value })}
        />
      </section>

      {!isB2B && (
        <section className="space-y-3">
          <p className="mono text-xs text-[var(--faint)]">PLATFORM</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => updateManually({ ...visibleData, platform: chip.value })}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  visibleData.platform === chip.value
                    ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--accent-text)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="mono text-xs text-[var(--faint)]">PRICE TIER</p>
        <div className="flex flex-wrap gap-2">
          {TIER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => updateManually({ ...visibleData, priceTier: chip.value })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                visibleData.priceTier === chip.value
                  ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--accent-text)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {isB2B && (
        <p className="text-xs text-[var(--faint)] border border-[var(--border)] rounded-lg p-3">
          B2B lane: LinkedIn broadcast + per-prospect outreach drafts. Orange Slice previews the audience first, then enriches real buyers only after your approval.
        </p>
      )}

      <button
        disabled={!canLaunch || loading}
        onClick={() => onLaunch(visibleData)}
        className="w-full lex-pill px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-40 hover:brightness-110 transition"
      >
        {loading ? "Forging…" : canLaunch ? "Forge campaign →" : "Complete the campaign brief"}
      </button>
    </div>
  );
}
