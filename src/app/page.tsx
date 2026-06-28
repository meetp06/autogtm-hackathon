"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { FollowUpView, IntakeView } from "@/components/IntakeView";
import { LiveRunView } from "@/components/LiveRunView";
import { ResultView } from "@/components/ResultView";
import { B2B_DEFAULT, IntakeData, View } from "@/lib/types";

const RESULT_STATUSES = new Set(["creative_ready", "ready_to_post", "posted", "failed"]);

export default function Home() {
  const [data, setData] = useState<IntakeData>(B2B_DEFAULT);
  const [view, setView] = useState<View>("intake");
  const [campaignId, setCampaignId] = useState<Id<"campaigns"> | null>(null);
  const [launching, setLaunching] = useState(false);
  const [confirmingAudience, setConfirmingAudience] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createCampaign = useMutation(api.campaigns.create);
  const campaign = useQuery(api.campaigns.get, campaignId ? { campaignId } : "skip");

  const currentView = useMemo<View>(() => {
    if (campaign && RESULT_STATUSES.has(campaign.status)) return "result";
    return view;
  }, [campaign, view]);

  async function launchPipeline(id: Id<"campaigns">, action?: "confirm_fiber_enrichment") {
    const response = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id, action }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Pipeline failed");
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    setError(null);
    try {
      const id = await createCampaign({
        ...data,
        icpQuery: data.mode === "b2b" ? data.audience : undefined,
      });
      setCampaignId(id);
      setView("live");
      await launchPipeline(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to launch pipeline");
    } finally {
      setLaunching(false);
    }
  }

  async function handleConfirmAudience() {
    if (!campaignId) return;
    setConfirmingAudience(true);
    setError(null);
    try {
      await launchPipeline(campaignId, "confirm_fiber_enrichment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fiber enrichment failed");
    } finally {
      setConfirmingAudience(false);
    }
  }

  function reset() {
    setData(B2B_DEFAULT);
    setCampaignId(null);
    setView("intake");
    setError(null);
    setLaunching(false);
    setConfirmingAudience(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-6xl">
        {error && (
          <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {currentView === "intake" && (
          <IntakeView data={data} onChange={setData} onNext={() => setView("followup")} />
        )}

        {currentView === "followup" && (
          <FollowUpView
            data={data}
            onChange={setData}
            onLaunch={handleLaunch}
            loading={launching}
          />
        )}

        {currentView === "live" && campaignId && (
          <LiveRunView
            campaignId={campaignId}
            product={campaign?.product ?? data.product}
            onConfirmAudience={handleConfirmAudience}
            confirmingAudience={confirmingAudience}
          />
        )}

        {currentView === "result" && campaignId && (
          <ResultView campaignId={campaignId} onReset={reset} />
        )}
      </div>
    </main>
  );
}
