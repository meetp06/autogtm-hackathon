"use client";

import { B2B_DEFAULT, B2C_DEFAULT, CRUITICAL_DEMO, IntakeData, Platform, PriceTier } from "@/lib/types";

type Props = {
  data: IntakeData;
  onChange: (data: IntakeData) => void;
  onNext: () => void;
};

export function IntakeView({ data, onChange, onNext }: Props) {
  const canContinue = data.product.trim().length > 0 && data.description.trim().length > 0;

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

          <button
            disabled={!canContinue}
            onClick={onNext}
            className="w-full lex-pill px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-40 hover:brightness-110 transition"
          >
            Forge campaign →
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
  onLaunch: () => void;
  loading?: boolean;
};

const B2C_AUDIENCE_CHIPS = ["Founders", "Consumers", "SMB teams", "Enterprise buyers"];
const B2B_ICP_CHIPS = [
  "VP Growth at Series A SaaS",
  "RevOps leaders at fintech",
  "Founders scaling outbound",
  "Head of Sales at dev tools",
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
  const isB2B = data.mode === "b2b";
  const canLaunch = data.audience.trim().length > 0 && data.differentiator.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Campaign qualifiers</h2>
      <p className="text-sm text-[var(--muted)]">
        {isB2B
          ? "Tune the buyer list and differentiator before the audience estimate."
          : "Tune the audience, platform, and price signal before creative generation."}
      </p>

      <section className="space-y-3">
        <p className="mono text-xs text-[var(--faint)]">
          {isB2B ? "IDEAL BUYER (ICP) — PLAIN ENGLISH" : "WHO IS IT FOR?"}
        </p>
        <div className="flex flex-wrap gap-2">
          {(isB2B ? B2B_ICP_CHIPS : B2C_AUDIENCE_CHIPS).map((chip) => (
            <button
              key={chip}
              onClick={() => onChange({ ...data, audience: chip, platform: isB2B ? "linkedin" : data.platform })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                data.audience === chip
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
          value={data.audience}
          onChange={(e) => onChange({ ...data, audience: e.target.value })}
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
          value={data.differentiator}
          onChange={(e) => onChange({ ...data, differentiator: e.target.value })}
        />
      </section>

      {!isB2B && (
        <section className="space-y-3">
          <p className="mono text-xs text-[var(--faint)]">PLATFORM</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => onChange({ ...data, platform: chip.value })}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  data.platform === chip.value
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
              onClick={() => onChange({ ...data, priceTier: chip.value })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                data.priceTier === chip.value
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
        onClick={onLaunch}
        className="w-full lex-pill px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-40 hover:brightness-110 transition"
      >
        {loading ? "Forging…" : "Forge campaign →"}
      </button>
    </div>
  );
}
