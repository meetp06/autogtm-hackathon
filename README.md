# AutoGTM

Multi-agent GTM pipeline: market research → demand gap → creative → staged social post.

## Stack

- **Next.js** (App Router) + React + Tailwind
- **Convex** — real-time state machine + file storage
- **OpenAI** — agent reasoning + image generation
- **Gooseworks** — creative execution: brand kit, ad generation, QC gate (via `GooseworksClient` adapter)
- **Fiber AI** — B2B audience building, enrichment, and buying signals
- **Composio** — OAuth publishing to Instagram/LinkedIn

## Quick start

```bash
cd autogtm
npm install
npx convex dev          # creates deployment + .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
OPENAI_API_KEY=
FIRECRAWL_API_KEY=
FIBER_API_KEY=
COMPOSIO_API_KEY=
NEXT_PUBLIC_CONVEX_URL=       # set by `npx convex dev`
CONVEX_DEPLOYMENT=            # set by `npx convex dev`
```

Without API keys, the app runs in **sample insights mode** — clearly labeled, no fabricated sources.

## Gooseworks (creative execution)

Install at the hackathon booth:

```bash
npx gooseworks install --codex
```

Verified skill slugs (from goose-skills repo):
- `update-brand-kit` — on-brand context layer
- `create-image-gpt-image-fal` — primary ad generation
- `verify-product-image` — QC gate before `ready_to_post`
- `competitor-ad-intelligence` — competitor creative gaps in Market Pulse

Set `FAL_API_KEY` for Gooseworks-aligned image gen. Without Gooseworks login, pipeline uses sample/fallback paths clearly labeled.

**Role split:** Fiber = WHO · Your agents = WHAT · Gooseworks = THE CREATIVE · AutoGTM = orchestration

## B2B lane (Fiber AI)

Toggle **B2B** on intake. Pipeline adds:

1. **Market Pulse** — Firecrawl reviews + Fiber buying-intent signals
2. **Demand Gap** — locks marketing angle
3. **Audience Finder** (Agent 4) — Fiber creates/builds audience, estimates enrichment credits, then waits for approval
4. **Fiber enrichment** — after explicit approval, exports real prospects into `prospects`
5. **Creative Studio** — LinkedIn broadcast + per-prospect outreach drafts
6. **Distribution** — approve broadcast + approve each outreach draft (you send manually)

Status: `queued → researching → angle_ready → building_audience → audience_ready → creative_ready → ready_to_post → posted`

Set `FIBER_API_KEY` from [fiber.ai/app/api](https://fiber.ai/app/api). Without it, sample prospects are clearly labeled.

## B2C lane

Original broadcast post flow (Instagram/LinkedIn). Skips Audience Finder.

## Agent pipeline (B2C)

1. **Market Pulse** — Firecrawl scrape → `signals` table (every claim has `sourceUrl`)
2. **Demand Gap** — locks angle → `demand` table
3. **Creative Studio** — gpt-image-1 + caption → `creatives` + Convex storage
4. **Distribution** — Composio OAuth, human approval required → `posts` table

Status flow: `queued → researching → angle_ready → creative_ready → ready_to_post → posted`

## Demo script

1. Enter a real product + 4 follow-up chips
2. Launch — narrate live Convex state table + activity log
3. Approve post — stages to connected account (demo mode without Composio)

## Compliance

- Posts only to user's own connected account
- No cold-DM automation
- Sample mode when scrape returns nothing
- Explicit approval before publish
