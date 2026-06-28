# Branding & UX Todo — Forge Demo

> Synthesized from: David Placek / Lexicon Branding (Vercel, Azure, Sonos), Marty Neumeier (The Brand Gap),
> David Aaker (Building Strong Brands), and 2026 SaaS naming research.

---

## 1. Naming Decision

### Guru Frameworks Applied

| Guru | Key Criteria Applied |
|------|---------------------|
| **David Placek** (Lexicon) | Sound symbolism (V=alive, B=reliable, Z=attention, X=innovation), Diamond Framework, generate 1,000+ candidates, invented = strongest trademark |
| **Marty Neumeier** | 7 criteria: Differentiated, Brief (<4 syllables), Appropriate, Easy to spell, Satisfying to pronounce, Brandplay-ready, Legally defensible |
| **David Aaker** | Extendibility: will name work as product grows across categories? |
| **2026 Consensus** | 4-8 chars, 1-3 syllables, .ai TLD respected (69% positive investor sentiment), avoid generic AI suffixes |

### Top 5 Candidates

| Rank | Name | Letters | Guru Rationale | Trademark Strength | Domain | Story |
|------|------|---------|---------------|-------------------|--------|-------|
| **#1** | **Forge** | 5 | High-imagery (Neumeier), plosive F+G (Lexicon: energetic sound), strongest brandplay potential | ⚠️ Common word (suggestive/arbitrary) | forge.ai ✓ | "Forge a campaign from live market signals" |
| **#2** | **Velt** | 4 | Invented = strongest trademark (Placek), "V" most alive/vibrant sound per Lexicon, from "velocity" → speed = core value prop | ✅ Fanciful (strongest class) | velt.ai ✓ | "Velt signals into campaigns" |
| **#3** | **Smelt** | 5 | Anglo-Saxon = high imagery (Neumeier), plosive S-M-L-T, utterly distinctive in GTM | ✅ Suggestive → Fanciful | smelt.ai ✓ | "Smelt market noise into campaign gold" |
| **#4** | **Anvil** | 5 | Highest visual imagery (Neumeier), extends naturally: "On the anvil", "Anvil strike", premium feel | ⚠️ Common word (arbitrary) | anvil.so ✓ | "Campaigns shaped on the anvil of market reality" |
| **#5** | **Stria** | 5 | Latin "streak/signal", palindrome structure (Placek: more memorable), zero competitors | ✅ Fanciful | stria.ai ✓ | "Follow the signal line from pain to campaign" |

### Recommendation

**Go with Forge** (domain: forge.ai) for the demo. It has the strongest emotional resonance,
clearest connection to the product (transformation + craft), and the best brandplay for a
3-minute demo pitch. "Forge a campaign" is a sentence judges can remember and repeat.

**Backup: Velt** — stronger trademark protection, shorter, directly communicates speed.
Use this if Forge faces legal/domain issues.

### Names to Avoid

- SignalForge (compound, 11 chars — too long per 2026 naming consensus)
- AutoGTM (current — generic, sounds like an internal tool)
- Anything with "AI", "GTM", "Agent", "Pilot" in the name (saturated space)

---

## 2. UI Copy Changes

### Global

| Current | New (with Forge) |
|---------|------------------|
| AutoGTM / LexAI | **Forge** |
| "Signal to post in under two minutes" | **"Launch while the market is still talking"** |
| "Launch agent pod" | **"Forge campaign"** |
| "Agent pod executing" | **"Forging campaign from live signals"** |
| Market Pulse | **Signal Scan** |
| Demand Gap | **Demand Angle** |
| Creative Studio | **Campaign Forge** |
| Distribution / Approval Desk | **Approval Desk** |
| "Nothing publishes automatically" | **"Approval required: Forge stages assets; you choose what ships"** |

### Intake View

| Element | Current | New |
|---------|---------|-----|
| Headline | "Launch a sourced GTM campaign while the trend is still alive" | "**Launch while the market is still talking**" |
| Subhead | "Agents turn live market signals into..." | "**Forge finds live buyer pain, locks the angle, and stages campaign assets for your approval.**" |
| Mode toggle | "Buyer outreach" / "Social campaign" | Keep — these are outcome-based ✓ |
| Demo button | "Use judge demo: Cruitical" | Keep ✓ |
| Primary CTA | "Build buyer campaign →" / "Create social campaign →" | "**Forge campaign →**" |

### Live Run View

| Element | Current | New |
|---------|---------|-----|
| Header | "LIVE RUN — {product}" | "**FORGING — {product}**" |
| Step title | status-based (e.g. "Reading live market signals") | Keep `getCurrentStep()` logic from `main` branch |
| "Now working" panel | Removed in `demo-hardening` | **Restore** — this is the hero element for Technical Complexity judging |
| Agent labels | Market Pulse, Demand Gap, Audience Finder, Creative Studio | **Signal Scan**, **Demand Angle**, **Audience Finder**, **Campaign Forge** |
| Backend panel | `convex.state` raw table | "**Backend proof**" — friendly labels with table names as secondary |

### Result View

| Element | Current | New |
|---------|---------|-----|
| Header | "RESULT · B2B/B2C" | "**CAMPAIGN READY**" |
| CampaignTransformation | Removed in `demo-hardening` | **Restore** — "From → Signal → Angle → To" (judges see transformation in 2s) |
| Layout | Post + insights side-by-side | **Post first** (left/hero), **rationale as evidence** (right/supporting) |
| Compliance | "Human-in-the-loop: nothing publishes automatically" | "**Approval required: Forge stages assets; you choose what ships.**" |
| QC block | Creative QC status | Keep — proves engineering rigor |

---

## 3. Visual Direction

### Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Orange (accent) | `#c0e05b` | Primary actions, active state, Forge brand color |
| Background | `#0a0a0b` | Main background (near-black) |
| Panel | `#141416` | Card/panel surfaces |
| Field | `#1a1a1e` | Input fields |
| Border | `#222226` | Subtle borders |
| Ink (text) | `#f0f0f2` | Primary text |
| Muted | `#888890` | Secondary text |
| Green | `#4ade80` | Approved/ready states |
| Amber | `#fbbf24` | Warnings, sample mode |
| Violet | `#a78bfa` | Creative/Campaign Forge accent |

### Rules

- **Reduce glow** — Only use glow on the primary CTA button, not on cards or borders
- **Fewer borders** — Use background contrast + spacing instead of bordered panels for hierarchy
- **Monospace** → only for technical proof (Backend proof panel), logs, source URLs
- **Sans-serif** for everything else (Bricolage Grotesque headings, Hanken Grotesk body)
- **No emoji in UI** — keeps it premium/SaaS-like

---

## 4. Implementation Checklist

### P0 — Must do before demo (2–3 hrs)

- [ ] Pick final name (Forge or Velt) and update everywhere:
  - `src/app/layout.tsx` — metadata title & description
  - `src/app/page.tsx` — welcome text
  - `src/components/IntakeView.tsx` — headlines, CTAs
  - `src/components/LiveRunView.tsx` — agent labels, titles
  - `src/components/ResultView.tsx` — agent labels, compliance copy
  - `README.md` — first paragraph
- [x] Intake: split layout (left input + right pipeline preview) — already in `main`✓
- [x] Intake: "Use judge demo: Cruitical" button — already in `main`✓
- [ ] Intake: update headline + subhead to new copy
- [ ] Intake: update CTA to "Forge campaign"
- [x] LiveRun: dominant current-step panel (`getCurrentStep()`) — already in `main`✓
- [ ] LiveRun: rename agents (Signal Scan, Demand Angle, Campaign Forge)
- [ ] LiveRun: update Backend proof panel with friendly labels
- [x] Result: CampaignTransformation strip — already in `main`✓
- [ ] Result: reorder layout (campaign hero first, rationale second)
- [ ] Result: update compliance copy

### P1 — High value (2–3 hrs)

- [ ] Add edit/regenerate affordances on ResultView:
  - edit caption
  - regenerate image
  - regenerate angle
  - copy draft text
- [ ] Add source count + sample/real mode indicator near Signal Scan results
- [ ] Add "Campaign brief" section in Result with: locked angle, buyer pain, target audience, launch asset
- [ ] Clean up `globals.css` — remove unused legacy CSS (Fiber references, old color vars)

### P2 — Polish (1–2 hrs if time allows)

- [ ] Reduce glow effects throughout (keep only on primary CTA)
- [ ] Increase spacing between sections (consistent padding scale)
- [ ] Replace "Fiber" references with "Orange Slice" or neutral "Audience"
- [ ] Check all `neutral-xxx` color references → replace with CSS variable tokens
- [ ] Favicon / browser tab icon

---

## 5. Demo Script (3 Minutes)

### 0:00–0:30 — Hook

> "Most GTM tools start with a blank prompt. Forge starts with live market evidence. It finds what buyers are already complaining about, turns that into a campaign angle, creates the asset, and stages the post or outreach for human approval. The wedge is compressing GTM latency from weeks to minutes."

### 0:30–1:00 — Input

> (Open UI, click "Use Cruitical demo")
>
> "I'll use the judge's startup — Cruitical, automated virtual work trials for screening engineers."
>
> (Show pipeline preview on right)
>
> "This is not one prompt generating a post. Each step in that pipeline is an independent agent writing structured state into Convex. The database is the handoff layer."
>
> (Click "Forge campaign")

### 1:00–2:00 — Live Run

> (Current-step panel shows "Finding buyer pain...")
>
> "Signal Scan is watching Reddit, X, and LinkedIn for real buyer conversations about hiring pain. As each agent finishes, it writes to Convex and the next agent picks up."
>
> (Steps advance: "Angle locked" → "Audience estimated" → "Campaign ready")
>
> "Demand Angle chooses the sharpest narrative wedge. Audience Finder builds the buyer list. Campaign Forge produces the asset with byte-level QC before human approval."
>
> (Point to Backend proof panel)
>
> "Every agent leaves structured state — signals, demand angle, prospects, creative. Nothing is hidden behind a spinner."

### 2:00–3:00 — Result

> (CampaignTransformation strip visible)
>
> "Here's the transformation: From 'Cruitical' → sourced signal 'Hiring managers burnt by LeetCode theater' → locked angle 'Stop hiring from LeetCode theater' → a launch-ready LinkedIn campaign."
>
> (Show post preview with image + caption + CTA)
>
> "Sourced signals on the right with URLs prove this isn't hallucinated. The image passed QC. Nothing publishes automatically — approval required."
>
> (Show outreach drafts for B2B, or staged post)
>
> "This is a launch-ready campaign with evidence, angle, creative, and human control. From market signal to staged distribution in under 2 minutes."

---

## 6. Key Design Decisions (Why)

| Decision | Rationale |
|----------|-----------|
| **Split intake layout** | Shows value before interaction — judges understand the product in <10s |
| **Current-step panel as hero** | Proves agents are real, not a spinner — wins Technical Complexity points |
| **CampaignTransformation strip** | Makes the before/after obvious in 2s — wins Usefulness points |
| **Campaign first in Result** | The output is the payoff — don't bury it under rationale |
| **Backend proof with friendly labels** | Shows engineering without looking like a database console — wins Technical Complexity + Design polish |
| **No auto-publish** | Compliance = trust = Usefulness. Positioned as enterprise control, not a limitation |
