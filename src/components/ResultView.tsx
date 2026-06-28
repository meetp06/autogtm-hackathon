"use client";

import { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";

type Props = {
  campaignId: Id<"campaigns">;
  onReset: () => void;
};

export function ResultView({ campaignId, onReset }: Props) {
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const signals = useQuery(api.campaigns.getSignals, { campaignId });
  const demand = useQuery(api.campaigns.getDemand, { campaignId });
  const creative = useQuery(api.campaigns.getCreative, { campaignId });
  const brandKit = useQuery(api.campaigns.getBrandKit, { campaignId });
  const prospects = useQuery(api.campaigns.getProspects, { campaignId });
  const outreach = useQuery(api.campaigns.getOutreach, { campaignId });
  const posts = useQuery(api.campaigns.getPosts, { campaignId });
  const approvePost = useMutation(api.campaigns.approvePost);
  const approveOutreach = useMutation(api.campaigns.approveOutreach);
  const approveAllOutreach = useMutation(api.campaigns.approveAllOutreach);
  const overrideQc = useMutation(api.campaigns.overrideQc);
  const [approvingPlatform, setApprovingPlatform] = useState<"instagram" | "linkedin" | null>(null);
  const [overriding, setOverriding] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSendGmail(outreachId: Id<"outreach">) {
    setSendingId(outreachId);
    setSendError(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, outreachId }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(b?.error ?? "Gmail send failed");
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Gmail send failed");
    } finally {
      setSendingId(null);
    }
  }

  const isB2B = (campaign?.mode ?? "b2c") === "b2b";
  const platform = creative?.platform ?? (isB2B ? "linkedin" : "instagram");
  const qcStatus = creative?.qcStatus ?? "pass";
  const creativeSource = creative?.source ?? "fallback";
  const qcBlocked = qcStatus !== "pass" && !campaign?.qcHumanOverride;
  const canApprove = campaign?.status === "ready_to_post" && !qcBlocked;
  const emailSubject = demand?.angleHeadline ?? campaign?.product ?? "Quick intro";
  const postPlatforms =
    posts && posts.length > 0
      ? posts.map((post) => post.platform)
      : [platform];

  async function handleOverrideQc() {
    setOverriding(true);
    try {
      await overrideQc({ campaignId });
    } finally {
      setOverriding(false);
    }
  }

  async function handleApprovePost(targetPlatform: "instagram" | "linkedin") {
    setApprovingPlatform(targetPlatform);
    try {
      await approvePost({ campaignId, approvedBy: "user", platform: targetPlatform });
    } finally {
      setApprovingPlatform(null);
    }
  }

  async function handleApproveOutreach(outreachId: Id<"outreach">) {
    await approveOutreach({ campaignId, outreachId, approvedBy: "user" });
  }

  async function handleApproveAllOutreach() {
    await approveAllOutreach({ campaignId, approvedBy: "user" });
  }

  if (campaign === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="mono text-xs text-[var(--faint)] animate-pulse">loading campaign…</p>
      </div>
    );
  }

  if (campaign?.status === "failed") {
    return (
      <div className="mx-auto max-w-lg space-y-5 rounded-2xl border border-red-300 bg-red-50 p-8 text-center">
        <p className="mono text-xs text-red-600">PIPELINE FAILED</p>
        <h2 className="text-xl font-semibold text-red-800">The growth pod hit an error</h2>
        <p className="text-sm text-red-700 whitespace-pre-wrap">
          {campaign.errorMessage ?? "An unexpected error stopped the pipeline before it finished."}
        </p>
        <p className="text-xs text-[var(--faint)]">
          Tip: with no API keys the pipeline runs in labeled sample mode. With keys connected, a real
          API error surfaces here as an honest failure rather than fabricated data — usually a network,
          credits, or Convex connection issue.
        </p>
        <button
          onClick={onReset}
          className="w-full lex-pill px-4 py-3 text-sm font-semibold text-[var(--accent-ink)]"
        >
          Start a new campaign
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mono text-xs text-[var(--accent-text)]">CAMPAIGN READY</p>
          <h2 className="text-2xl font-semibold">{demand?.angleHeadline ?? "Your campaign"}</h2>
          <p className="text-sm text-[var(--muted)] mt-1">{demand?.reason}</p>
        </div>
        <button onClick={onReset} className="text-xs text-[var(--faint)] hover:text-[var(--ink)]">
          New campaign
        </button>
      </header>

      <CampaignTransformation
        description={campaign?.description ?? "Product description"}
        signal={signals?.[0]?.text}
        angle={demand?.angleHeadline}
        output={isB2B ? "LinkedIn broadcast + outreach drafts" : `${platform} post ready for approval`}
      />

      <CampaignBrief
        product={campaign?.product ?? ""}
        angle={demand?.angleHeadline}
        reason={demand?.reason}
        signalCount={signals?.length ?? 0}
        audienceLabel={campaign?.audience ?? ""}
        assetType={isB2B ? "LinkedIn post + outreach" : `${platform} post`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PostPreview
          platform={platform}
          product={campaign?.product ?? ""}
          caption={creative?.caption ?? ""}
          hashtags={creative?.hashtags ?? []}
          imageUrl={creative?.imageUrl}
          cta={creative?.cta ?? "Learn more"}
        />

        <div className="space-y-4">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="mono text-xs text-[var(--faint)]">market insights (sourced)</p>
              <span className="text-xs text-[var(--accent-text)]">{signals?.length ?? 0} sources</span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto text-sm">
              {(signals ?? []).map((s, i) => (
                <div
                  key={i}
                  className="border-l-2 pl-3"
                  style={{
                    borderColor:
                      s.type === "why_buy"
                        ? "var(--green)"
                        : s.type === "buying_intent"
                          ? "var(--orange)"
                          : s.type === "creative_gap"
                            ? "var(--violet)"
                            : "var(--amber)",
                  }}
                >
                  {s.type === "buying_intent" && (
                    <span className="mono text-[10px] text-[var(--accent-text)]">INTENT · </span>
                  )}
                  {s.type === "creative_gap" && (
                    <span className="mono text-[10px] text-[var(--violet)]">CREATIVE GAP · </span>
                  )}
                  <p>{s.text}</p>
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--faint)] hover:text-[var(--accent-text)] break-all"
                  >
                    {s.sourceUrl}
                  </a>
                </div>
              ))}
            </div>
          </section>

          {isB2B && prospects && prospects.length > 0 && (
            <section className="rounded-xl border border-[var(--orange)]/30 bg-[var(--orange)]/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="mono text-xs text-[var(--accent-text)]">audience · orange slice</p>
                <span className="text-xs text-[var(--faint)]">
                  {prospects.length} enriched{campaign?.isSampleProspects ? " (sample)" : ""}
                </span>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto text-sm">
                {prospects.slice(0, 5).map((p) => (
                  <div key={p._id} className="border-l-2 border-[var(--orange)] pl-3">
                    <p className="font-medium">{p.name} — {p.role}</p>
                    <p className="text-[var(--faint)] text-xs">{p.company} · {p.intentSignal}</p>
                    {(p.workEmail || p.phone) && (
                      <p className="text-[var(--faint)] text-xs">
                        {[p.workEmail, p.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <p className="mono text-xs text-[var(--faint)]">broadcast caption</p>
              <div className="flex items-center gap-2">
                {creative?.caption && (
                  <button
                    onClick={() => navigator.clipboard.writeText(creative.caption ?? "")}
                    className="mono text-[10px] text-[var(--accent-text)] hover:underline"
                  >
                    Copy
                  </button>
                )}
                {creative && (
                  <span
                    className={`mono text-[10px] px-2 py-0.5 rounded ${
                      qcStatus === "pass"
                        ? "bg-[var(--green)]/10 text-[var(--green)]"
                        : "bg-[var(--amber)]/10 text-[var(--amber)]"
                    }`}
                  >
                    QC: {qcStatus} · {creativeSource}
                  </span>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap">{creative?.caption}</p>
            {!isB2B && <p className="text-[var(--violet)]">{creative?.hashtags?.join(" ")}</p>}
            {brandKit && (
              <p className="text-xs text-[var(--faint)]">
                Brand kit: {brandKit.voice} · {brandKit.primaryColor}
              </p>
            )}
          </section>

          {qcBlocked && (
            <div className="rounded-xl border border-[var(--amber)]/35 bg-[var(--amber)]/10 p-4 text-xs text-[var(--ink)] space-y-3">
              <p>
                Creative QC ({qcStatus}) — review the creative before publish.
                {creative?.qcReportUrl && (
                  <span className="block mono text-[var(--faint)] mt-1">{creative.qcReportUrl}</span>
                )}
              </p>
              <button
                onClick={handleOverrideQc}
                disabled={overriding}
                className="w-full rounded-lg border border-[var(--amber)] py-2 text-[var(--amber)] hover:bg-[var(--amber)]/15"
              >
                {overriding ? "Approving…" : "Human override — approve for publish"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-[var(--amber)]/35 bg-[var(--amber)]/10 p-4 text-xs text-[var(--ink)]">
            {isB2B
              ? "Approval required: CampaignOS stages outreach drafts for you to copy & send from your own LinkedIn. Never auto-DM strangers."
              : "Approval required: CampaignOS stages the post for you to review and publish from your own account. Nothing publishes automatically."}
          </div>

          <div className="space-y-2">
            {postPlatforms.map((postPlatform) => {
              const post = posts?.find((row) => row.platform === postPlatform);
              const isPublished = post?.state === "published" || campaign?.status === "posted";
              const isApproving = approvingPlatform === postPlatform;

              return (
                <button
                  key={postPlatform}
                  onClick={() => handleApprovePost(postPlatform)}
                  disabled={isApproving || isPublished || !canApprove}
                  className="lex-pill w-full px-4 py-3.5 text-sm disabled:opacity-50"
                >
                  {isPublished
                    ? `Broadcast staged to ${postPlatform} ✓`
                    : isApproving
                      ? "Approving…"
                      : `Approve broadcast → ${postPlatform === "instagram" ? "Instagram" : "LinkedIn"}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isB2B && outreach && outreach.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Personalized outreach drafts</h3>
            <button
              onClick={handleApproveAllOutreach}
              className="text-xs text-[var(--accent-text)] hover:underline"
            >
              Mark all done
            </button>
          </div>
          <p className="text-xs text-[var(--faint)]">
            <strong className="text-[var(--ink)]">Send via Gmail</strong> = one-click auto-send (Orange
            Slice). LinkedIn / Email ✉ / Copy = free assisted fallbacks (open + paste).
          </p>
          {sendError && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
              Gmail send failed: {sendError}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {outreach.map((row) => (
              <div
                key={row._id}
                className="rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] p-4 space-y-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {row.prospect?.name} · {row.prospect?.role}
                  </p>
                  <p className="text-xs text-[var(--faint)]">{row.prospect?.company}</p>
                  <a
                    href={row.prospect?.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--accent-text)] hover:underline"
                  >
                    View profile
                  </a>
                </div>
                <p className="text-sm whitespace-pre-wrap text-[var(--ink)]">{row.draftMessage}</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(row.draftMessage);
                        } catch {
                          /* clipboard may be blocked; profile still opens */
                        }
                        if (row.prospect?.linkedinUrl) {
                          window.open(row.prospect.linkedinUrl, "_blank", "noopener,noreferrer");
                        }
                        if (row.state === "draft") await handleApproveOutreach(row._id);
                      }}
                      className="lex-pill py-2 text-xs"
                    >
                      Connect on LinkedIn ↗
                    </button>
                    {row.prospect?.workEmail && (
                      <button
                        onClick={() => handleSendGmail(row._id)}
                        disabled={sendingId === row._id || row.state === "sent"}
                        className="lex-pill py-2 text-xs disabled:opacity-50"
                      >
                        {row.state === "sent"
                          ? "Sent via Gmail ✓"
                          : sendingId === row._id
                            ? "Sending…"
                            : "Send via Gmail"}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {row.prospect?.workEmail && (
                      <a
                        href={`mailto:${row.prospect.workEmail}?subject=${encodeURIComponent(
                          emailSubject
                        )}&body=${encodeURIComponent(row.draftMessage)}`}
                        className="flex-1 rounded-full border border-[var(--border)] px-3 py-2 text-center text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                        title={`Open mail app for ${row.prospect.workEmail}`}
                      >
                        Email ✉ (manual)
                      </a>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(row.draftMessage).catch(() => {})}
                      className="rounded-full border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                      title="Copy note only"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {posts && posts.length > 0 && (
        <p className="mono text-xs text-[var(--faint)] text-center">
          post state: {posts.map((p) => `${p.platform}=${p.state}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

function CampaignTransformation({
  description,
  signal,
  angle,
  output,
}: {
  description: string;
  signal?: string;
  angle?: string;
  output: string;
}) {
  const steps = [
    { label: "From", value: description },
    { label: "Signal", value: signal ?? "Market evidence collected" },
    { label: "Angle", value: angle ?? "Campaign angle selected" },
    { label: "To", value: output },
  ];

  return (
    <section className="grid gap-3 rounded-3xl border border-[var(--border)] bg-[var(--field)] p-4 shadow-[var(--shadow-sm)] md:grid-cols-4">
      {steps.map((step) => (
        <div key={step.label} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
          <p className="mono text-[10px] text-[var(--accent-text)]">{step.label}</p>
          <p className="mt-2 line-clamp-3 text-sm font-semibold text-[var(--ink)]">{step.value}</p>
        </div>
      ))}
    </section>
  );
}

function CampaignBrief({
  product,
  angle,
  reason,
  signalCount,
  audienceLabel,
  assetType,
}: {
  product: string;
  angle?: string;
  reason?: string;
  signalCount: number;
  audienceLabel: string;
  assetType: string;
}) {
  const items = [
    { label: "Product", value: product },
    { label: "Angle", value: angle ?? "Locked by Demand Angle" },
    { label: "Buyer pain", value: reason ?? "Sourced from live markets" },
    { label: "Audience", value: audienceLabel || (signalCount > 0 ? `${signalCount} signal sources` : "Estimated by Audience Finder") },
    { label: "Asset", value: assetType },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--field)] p-4">
      <p className="mono text-xs text-[var(--accent-text)] mb-3">Campaign brief</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
            <p className="mono text-[10px] text-[var(--faint)]">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ink)] line-clamp-2">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PostPreview({
  platform,
  product,
  caption,
  hashtags,
  imageUrl,
  cta,
}: {
  platform: "instagram" | "linkedin";
  product: string;
  caption: string;
  hashtags: string[];
  imageUrl?: string | null;
  cta: string;
}) {
  const isIg = platform === "instagram";

  return (
    <div
      className="mx-auto w-full max-w-sm rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface)] shadow-[var(--shadow-md)]"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--orange)] to-amber-600" />
        <div>
          <p className="text-sm font-medium">{product || "your_brand"}</p>
          <p className="text-xs text-[var(--faint)]">{isIg ? "Instagram" : "LinkedIn"} preview</p>
        </div>
      </div>

      <div
        className={`bg-[var(--field)] flex items-center justify-center text-[var(--faint)] text-sm ${
          isIg ? "aspect-[4/5]" : "aspect-[1.91/1]"
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Generated ad" className="h-full w-full object-cover" />
        ) : (
          <span className="mono text-xs">[ generated ad image ]</span>
        )}
      </div>

      <div className="p-4 space-y-2 text-sm">
        <p className="whitespace-pre-wrap">{caption}</p>
        {isIg && <p className="text-[var(--violet)] text-xs">{hashtags.join(" ")}</p>}
        <button className="mt-2 rounded-full bg-[var(--sand)] px-4 py-1.5 text-xs">{cta}</button>
      </div>
    </div>
  );
}
