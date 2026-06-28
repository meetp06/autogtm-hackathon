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

  const isB2B = (campaign?.mode ?? "b2c") === "b2b";
  const platform = creative?.platform ?? (isB2B ? "linkedin" : "instagram");
  const qcStatus = creative?.qcStatus ?? "pass";
  const creativeSource = creative?.source ?? "fallback";
  const qcBlocked = qcStatus !== "pass" && !campaign?.qcHumanOverride;
  const canApprove = campaign?.status === "ready_to_post" && !qcBlocked;
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

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mono text-xs text-[var(--orange)]">RESULT {isB2B ? "· B2B" : "· B2C"}</p>
          <h2 className="text-2xl font-semibold">{demand?.angleHeadline ?? "Your campaign"}</h2>
          <p className="text-sm text-neutral-400 mt-1">{demand?.reason}</p>
        </div>
        <button onClick={onReset} className="text-xs text-neutral-500 hover:text-white">
          New campaign
        </button>
      </header>

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
          <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <p className="mono text-xs text-neutral-500 mb-3">market insights (sourced)</p>
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
                    <span className="mono text-[10px] text-[var(--orange)]">INTENT · </span>
                  )}
                  {s.type === "creative_gap" && (
                    <span className="mono text-[10px] text-[var(--violet)]">CREATIVE GAP · </span>
                  )}
                  <p>{s.text}</p>
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-neutral-500 hover:text-[var(--orange)] break-all"
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
                <p className="mono text-xs text-[var(--orange)]">audience · fiber</p>
                <span className="text-xs text-neutral-500">
                  {prospects.length} enriched{campaign?.isSampleProspects ? " (sample)" : ""}
                </span>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto text-sm">
                {prospects.slice(0, 5).map((p) => (
                  <div key={p._id} className="border-l-2 border-[var(--orange)] pl-3">
                    <p className="font-medium">{p.name} — {p.role}</p>
                    <p className="text-neutral-500 text-xs">{p.company} · {p.intentSignal}</p>
                    {(p.workEmail || p.phone) && (
                      <p className="text-neutral-500 text-xs">
                        {[p.workEmail, p.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <p className="mono text-xs text-neutral-500">broadcast caption</p>
              {creative && (
                <span
                  className={`mono text-[10px] px-2 py-0.5 rounded ${
                    qcStatus === "pass"
                      ? "bg-green-950 text-green-400"
                      : "bg-amber-950 text-amber-400"
                  }`}
                >
                  QC: {qcStatus} · {creativeSource}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap">{creative?.caption}</p>
            {!isB2B && <p className="text-[var(--violet)]">{creative?.hashtags?.join(" ")}</p>}
            {brandKit && (
              <p className="text-xs text-neutral-500">
                Brand kit: {brandKit.voice} · {brandKit.primaryColor}
              </p>
            )}
          </section>

          {qcBlocked && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-200 space-y-3">
              <p>
                Gooseworks QC ({qcStatus}) — review the creative before publish.
                {creative?.qcReportUrl && (
                  <span className="block mono text-neutral-500 mt-1">{creative.qcReportUrl}</span>
                )}
              </p>
              <button
                onClick={handleOverrideQc}
                disabled={overriding}
                className="w-full rounded-lg border border-amber-600 py-2 text-amber-300 hover:bg-amber-950/40"
              >
                {overriding ? "Approving…" : "Human override — approve for publish"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-200">
            {isB2B
              ? "Human-in-the-loop: outreach drafts are for YOU to copy & send from your own LinkedIn. Never auto-DM strangers."
              : "Human-in-the-loop: nothing publishes without your approval. Posts only go to your own connected account via Composio OAuth."}
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
                  className="w-full rounded-lg bg-[var(--green)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
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
              className="text-xs text-[var(--orange)] hover:underline"
            >
              Approve all drafts
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {outreach.map((row) => (
              <div
                key={row._id}
                className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 space-y-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {row.prospect?.name} · {row.prospect?.role}
                  </p>
                  <p className="text-xs text-neutral-500">{row.prospect?.company}</p>
                  <a
                    href={row.prospect?.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--orange)] hover:underline"
                  >
                    View profile
                  </a>
                </div>
                <p className="text-sm whitespace-pre-wrap text-neutral-300">{row.draftMessage}</p>
                <button
                  onClick={() => handleApproveOutreach(row._id)}
                  disabled={row.state !== "draft"}
                  className="w-full rounded-lg border border-[var(--green)] text-[var(--green)] py-2 text-xs disabled:opacity-40"
                >
                  {row.state === "draft" ? "Approve draft (copy & send yourself)" : `${row.state} ✓`}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {posts && posts.length > 0 && (
        <p className="mono text-xs text-neutral-500 text-center">
          post state: {posts.map((p) => `${p.platform}=${p.state}`).join(" · ")}
        </p>
      )}
    </div>
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
      className={`mx-auto w-full max-w-sm rounded-2xl border border-[var(--border)] overflow-hidden ${
        isIg ? "bg-black" : "bg-[#1b1f23]"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--orange)] to-amber-600" />
        <div>
          <p className="text-sm font-medium">{product || "your_brand"}</p>
          <p className="text-xs text-neutral-500">{isIg ? "Instagram" : "LinkedIn"} preview</p>
        </div>
      </div>

      <div
        className={`bg-neutral-900 flex items-center justify-center text-neutral-600 text-sm ${
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
        <button className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs">{cta}</button>
      </div>
    </div>
  );
}
