"use client";

import { B2B_DEFAULT, B2C_DEFAULT, IntakeData, Platform, PriceTier } from "@/lib/types";

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
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3 text-center">
        <div className="mx-auto h-24 w-24 rounded-full dot-sun agent-pulse" />
        <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--orange)]">AutoGTM</p>
        <h1 className="text-3xl font-semibold tracking-tight">Signal to post in under two minutes</h1>
        <p className="text-sm text-neutral-400">
          {data.mode === "b2b"
            ? "Find buyers with Fiber, lock the angle, draft personalized outreach — you approve every send."
            : "Type what you're selling. Agents read the market, lock the angle, and stage a post for your approval."}
        </p>
      </header>

      <div className="flex rounded-lg border border-[var(--border)] p-1 bg-[var(--panel)]">
        <button
          onClick={() => setMode("b2b")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            data.mode === "b2b" ? "bg-[var(--orange)] text-black" : "text-neutral-400"
          }`}
        >
          B2B — SaaS / tools
        </button>
        <button
          onClick={() => setMode("b2c")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            data.mode === "b2c" ? "bg-[var(--orange)] text-black" : "text-neutral-400"
          }`}
        >
          B2C — drinks / devices
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 space-y-4">
        <label className="block space-y-2">
          <span className="mono text-xs text-neutral-500">PRODUCT NAME</span>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-black px-4 py-3 text-sm outline-none focus:border-[var(--orange)]"
            placeholder={data.mode === "b2b" ? "e.g. AutoGTM" : "e.g. VitalCoach"}
            value={data.product}
            onChange={(e) => onChange({ ...data, product: e.target.value })}
          />
        </label>

        <label className="block space-y-2">
          <span className="mono text-xs text-neutral-500">ONE-LINE DESCRIPTION</span>
          <textarea
            className="w-full rounded-lg border border-[var(--border)] bg-black px-4 py-3 text-sm outline-none focus:border-[var(--orange)] min-h-[88px]"
            placeholder={
              data.mode === "b2b"
                ? "AI agent pod that turns market signals into GTM campaigns"
                : "AI health coach that turns wearable data into daily actions"
            }
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
          />
        </label>

        <button
          disabled={!canContinue}
          onClick={onNext}
          className="w-full rounded-lg bg-[var(--orange)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-40 hover:brightness-110 transition"
        >
          Continue →
        </button>
      </div>
    </div>
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
      <h2 className="text-xl font-semibold">Quick qualifiers</h2>
      <p className="text-sm text-neutral-400">
        {isB2B
          ? "Your ICP goes straight to Fiber as a prospecting query."
          : "Four taps — then the agent pod runs."}
      </p>

      <section className="space-y-3">
        <p className="mono text-xs text-neutral-500">
          {isB2B ? "IDEAL BUYER (ICP) — PLAIN ENGLISH" : "WHO IS IT FOR?"}
        </p>
        <div className="flex flex-wrap gap-2">
          {(isB2B ? B2B_ICP_CHIPS : B2C_AUDIENCE_CHIPS).map((chip) => (
            <button
              key={chip}
              onClick={() => onChange({ ...data, audience: chip, platform: isB2B ? "linkedin" : data.platform })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                data.audience === chip
                  ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]"
                  : "border-[var(--border)] text-neutral-400"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
          placeholder={isB2B ? "e.g. VP Growth at Series A–B SaaS scaling outbound" : "Or type custom audience"}
          value={data.audience}
          onChange={(e) => onChange({ ...data, audience: e.target.value })}
        />
      </section>

      <section className="space-y-3">
        <p className="mono text-xs text-neutral-500">ONE DIFFERENTIATOR</p>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
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
          <p className="mono text-xs text-neutral-500">PLATFORM</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => onChange({ ...data, platform: chip.value })}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  data.platform === chip.value
                    ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]"
                    : "border-[var(--border)] text-neutral-400"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="mono text-xs text-neutral-500">PRICE TIER</p>
        <div className="flex flex-wrap gap-2">
          {TIER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onChange({ ...data, priceTier: chip.value })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                data.priceTier === chip.value
                  ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]"
                  : "border-[var(--border)] text-neutral-400"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {isB2B && (
        <p className="text-xs text-neutral-500 border border-[var(--border)] rounded-lg p-3">
          B2B lane: LinkedIn broadcast + per-prospect outreach drafts. Fiber estimates credits first, then enriches real buyers only after your approval.
        </p>
      )}

      <button
        disabled={!canLaunch || loading}
        onClick={onLaunch}
        className="w-full rounded-lg bg-[var(--orange)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-40"
      >
        {loading ? "Launching…" : "Launch agent pod →"}
      </button>
    </div>
  );
}
