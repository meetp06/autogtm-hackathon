"use client";

import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

const B2C_AGENTS = [
  { id: "market", label: "Market Pulse", color: "var(--amber)", desc: "Firecrawl reviews" },
  { id: "demand", label: "Demand Gap", color: "var(--green)", desc: "Locks the angle" },
  { id: "creative", label: "Creative Studio", color: "var(--violet)", desc: "Image + caption" },
] as const;

const B2B_AGENTS = [
  { id: "market", label: "Market Pulse", color: "var(--amber)", desc: "Reviews + intent signals" },
  { id: "demand", label: "Demand Gap", color: "var(--green)", desc: "Locks the angle" },
  { id: "audience", label: "Audience Finder", color: "var(--orange)", desc: "Fiber estimate + enrichment" },
  { id: "creative", label: "Creative Studio", color: "var(--violet)", desc: "Post + outreach drafts" },
] as const;

type Props = {
  campaignId: Id<"campaigns">;
  product: string;
  onConfirmAudience?: () => void;
  confirmingAudience?: boolean;
};

export function LiveRunView({ campaignId, product, onConfirmAudience, confirmingAudience }: Props) {
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const logs = useQuery(api.campaigns.getActivityLogs, { campaignId });
  const signals = useQuery(api.campaigns.getSignals, { campaignId });
  const prospects = useQuery(api.campaigns.getProspects, { campaignId });
  const audience = useQuery(api.campaigns.getAudience, { campaignId });

  const isB2B = (campaign?.mode ?? "b2c") === "b2b";
  const AGENTS = isB2B ? B2B_AGENTS : B2C_AGENTS;
  const status = campaign?.status ?? "queued";

  const activeAgent =
    status === "researching"
      ? "market"
      : status === "angle_ready"
        ? "demand"
        : status === "building_audience" || status === "finding_audience"
          ? "audience"
          : status === "audience_ready" || status === "creative_ready" || status === "ready_to_post"
            ? "creative"
            : "system";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <p className="mono text-xs text-[var(--orange)]">LIVE RUN — {product}</p>
          <h2 className="text-2xl font-semibold mt-1">
            Agent pod executing {isB2B ? "(B2B)" : "(B2C)"}
          </h2>
          {(campaign?.isSampleData || campaign?.isSampleProspects) && (
            <p className="mt-2 text-xs text-amber-400 border border-amber-900/50 bg-amber-950/30 rounded px-3 py-2">
              Sample mode active — claims labeled sample:// until API keys connect.
            </p>
          )}
        </div>

        <div className={`grid gap-3 ${isB2B ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          {AGENTS.map((agent) => {
            const isActive = activeAgent === agent.id;
            return (
              <div
                key={agent.id}
                className={`rounded-xl border p-4 transition ${isActive ? "agent-pulse" : "opacity-60"}`}
                style={{ borderColor: isActive ? agent.color : "var(--border)" }}
              >
                <div className="h-2 w-2 rounded-full mb-3" style={{ background: agent.color }} />
                <p className="font-medium text-sm">{agent.label}</p>
                <p className="text-xs text-neutral-500 mt-1">{agent.desc}</p>
              </div>
            );
          })}
        </div>

        {isB2B && (
          <AudiencePanel
            prospects={prospects ?? []}
            status={status}
            isSample={campaign?.isSampleProspects}
            audience={audience ?? null}
            onConfirmAudience={onConfirmAudience}
            confirmingAudience={confirmingAudience}
          />
        )}

        <div className="rounded-xl border border-[var(--border)] bg-black p-4 h-64 overflow-y-auto mono text-xs">
          <p className="text-neutral-500 mb-3">{"// activity stream"}</p>
          {(logs ?? []).map((log, i) => (
            <div key={i} className="log-line mb-2">
              <span style={{ color: agentColor(log.agent) }}>[{log.agent}]</span>{" "}
              <span className="text-neutral-300">{log.message}</span>
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <p className="text-neutral-600">Waiting for agent output…</p>
          )}
        </div>
      </div>

      <ConvexStateTable
        status={status}
        signalCount={signals?.length ?? 0}
        prospectCount={prospects?.length ?? 0}
        audienceEstimate={audience?.estimatedCredits}
        audienceState={audience?.state}
        isB2B={isB2B}
        isSample={campaign?.isSampleData}
        isSampleProspects={campaign?.isSampleProspects}
      />
    </div>
  );
}

function AudiencePanel({
  prospects,
  status,
  isSample,
  audience,
  onConfirmAudience,
  confirmingAudience,
}: {
  prospects: Array<{
    name: string;
    role: string;
    company: string;
    intentSignal: string;
    sourceUrl: string;
  }>;
  status: string;
  isSample?: boolean;
  audience?: {
    estimatedCredits: number;
    availableCredits?: number;
    listSize: number;
    state: string;
  } | null;
  onConfirmAudience?: () => void;
  confirmingAudience?: boolean;
}) {
  const waitingForConfirm =
    status === "building_audience" &&
    audience?.state === "estimated" &&
    prospects.length === 0;
  const loading =
    (status === "building_audience" && !waitingForConfirm) ||
    status === "finding_audience" ||
    (status === "angle_ready" && prospects.length === 0);

  return (
    <div className="rounded-xl border border-[var(--orange)]/30 bg-[var(--orange)]/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="mono text-xs text-[var(--orange)]">audience.fiber</p>
        <span className="text-xs text-neutral-500">
          {waitingForConfirm ? "estimate ready" : loading ? "building..." : `${prospects.length} prospects`}
          {isSample && prospects.length > 0 ? " (sample)" : ""}
        </span>
      </div>
      {waitingForConfirm && audience ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--orange)]/40 bg-black/30 p-3">
            <p className="text-sm text-neutral-300">
              This will cost{" "}
              <span className="font-semibold text-[var(--orange)]">{audience.estimatedCredits} Fiber credits</span>{" "}
              to enrich up to {audience.listSize} prospects. Proceed?
            </p>
            {audience.availableCredits !== undefined && (
              <p className="mt-1 text-xs text-neutral-500">
                Fiber credits available: {audience.availableCredits}
              </p>
            )}
          </div>
          <button
            onClick={onConfirmAudience}
            disabled={!onConfirmAudience || confirmingAudience}
            className="w-full rounded-lg bg-[var(--orange)] px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
          >
            {confirmingAudience ? "Enriching with Fiber..." : "Confirm Fiber enrichment"}
          </button>
        </div>
      ) : prospects.length === 0 ? (
        <p className="text-sm text-neutral-500">Resolving ICP into a qualified buyer list...</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {prospects.slice(0, 4).map((p, i) => (
            <div key={i} className="text-xs border-l-2 border-[var(--orange)] pl-3">
              <p className="font-medium">{p.name} · {p.role}</p>
              <p className="text-neutral-500">{p.company}</p>
              <p className="text-neutral-400 mt-0.5">{p.intentSignal}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function agentColor(agent: string) {
  if (agent === "market") return "var(--amber)";
  if (agent === "demand") return "var(--green)";
  if (agent === "audience") return "var(--orange)";
  if (agent === "creative") return "var(--violet)";
  return "var(--orange)";
}

function ConvexStateTable({
  status,
  signalCount,
  prospectCount,
  audienceEstimate,
  audienceState,
  isB2B,
  isSample,
  isSampleProspects,
}: {
  status: string;
  signalCount: number;
  prospectCount: number;
  audienceEstimate?: number;
  audienceState?: string;
  isB2B: boolean;
  isSample?: boolean;
  isSampleProspects?: boolean;
}) {
  const rows = [
    { table: "campaigns", field: "status", value: status },
    { table: "signals", field: "count", value: String(signalCount) },
    ...(isB2B
      ? [{ table: "prospects", field: "count", value: String(prospectCount) }]
      : []),
    ...(isB2B && audienceEstimate !== undefined
      ? [{ table: "audiences", field: "estimate", value: `${audienceEstimate} credits` }]
      : []),
    ...(isB2B && audienceState
      ? [{ table: "audiences", field: "state", value: audienceState }]
      : []),
    { table: "demand", field: "locked", value: ["angle_ready", "building_audience", "finding_audience", "audience_ready", "creative_ready", "ready_to_post", "posted"].includes(status) ? "yes" : "pending" },
    { table: "creatives", field: "ready", value: status === "ready_to_post" || status === "posted" ? "yes" : "pending" },
    { table: "meta", field: "sample_mode", value: isSample ? "true" : "false" },
    ...(isB2B
      ? [{ table: "meta", field: "sample_prospects", value: isSampleProspects ? "true" : "false" }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 h-fit">
      <p className="mono text-xs text-neutral-500 mb-3">convex.state</p>
      <table className="w-full text-xs mono">
        <thead>
          <tr className="text-neutral-500 border-b border-[var(--border)]">
            <th className="text-left py-2">table</th>
            <th className="text-left py-2">field</th>
            <th className="text-right py-2">value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.table}-${row.field}-${i}`} className="border-b border-[var(--border)]/50">
              <td className="py-2 text-neutral-400">{row.table}</td>
              <td className="py-2 text-neutral-500">{row.field}</td>
              <td className="py-2 text-right text-[var(--green)]">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
