# CampaignOS UX Roadmap

## Summary

CampaignOS has a strong core workflow: input a product, find market signals, generate a GTM angle, create campaign assets, and require human approval. The current UX underplays that value. It feels more like a technical demo form than a premium, credible SaaS product.

The priority is to make the transformation obvious within seconds:

`product input -> sourced buyer pain -> locked angle -> ready-to-approve campaign`

For the YC demo, the UI should optimize for judge comprehension and trust in a 3-minute window, not broad self-serve onboarding.

## Highest-Priority Issues

1. **The first screen undersells the product**
   The current intake is a centered orb, headline, mode toggle, two fields, and a button. It hides the most impressive parts of the product until after interaction.

   **Action:** Replace the first screen with a split composition: input on the left, live pipeline preview on the right. Show the promise before the user clicks.

2. **Prefilled CampaignOS data makes the experience feel staged**
   Loading with `CampaignOS` already filled helps demos, but it reduces trust. Users may assume the output is hardcoded.

   **Action:** Keep normal fields empty by default. Add an explicit `Use Cruitical demo` preset button for the hackathon flow.

3. **The B2B/B2C toggle describes internal categories, not user outcomes**
   Labels like `B2B - SaaS / tools` and `B2C - drinks / devices` require users to map themselves into the system's taxonomy.

   **Action:** Rename around outcomes:
   - `Buyer outreach`
   - `Social campaign`

4. **The live run shows internals instead of telling a story**
   Agent cards, activity logs, and Convex state prove engineering, but the screen lacks one dominant focal point.

   **Action:** Add a large current-step panel:
   - `Finding buyer pain from Reddit/X/LinkedIn`
   - `Angle locked`
   - `Audience estimated`
   - `Campaign ready`

   Keep logs and agent cards as supporting detail.

5. **The Convex state table is too raw for the main UI**
   Rows like `campaigns`, `signals`, `meta`, and `sample_mode` are meaningful to engineers, but they look like implementation leakage.

   **Action:** Reframe it as `Backend proof` or `Orchestration proof`, with friendlier labels:
   - `Research signals`
   - `Audience records`
   - `Creative asset`
   - `Approval gate`

   Keep raw table names only as subtle secondary details.

6. **The result page buries the payoff**
   The generated campaign competes visually with insights, QC state, warnings, approval buttons, outreach drafts, and post state.

   **Action:** Reorder the result view:
   - Top: final campaign output
   - Middle: sourced rationale
   - Bottom: approve, copy, edit, and regenerate controls

7. **The product lacks a clear before/after moment**
   The app promises `signal to post in under two minutes`, but it does not visually show the transformation.

   **Action:** Add a compact result strip:
   - `From`: product description
   - `Signal`: sourced buyer pain
   - `Angle`: selected campaign angle
   - `To`: ready post/outreach

8. **The visual system is competent but too developer-dashboard heavy**
   The dark UI, orange glow, monospace labels, and many bordered panels create a technical dashboard feel. It is credible, but not yet premium.

   **Action:** Reduce glow, reduce borders, increase spacing discipline, use fewer accent colors, and reserve monospace for technical proof only.

## Recommended UX Pass

### Intake

- Replace silent prefilled defaults with an explicit demo preset.
- Use outcome-based mode labels.
- Add a right-side pipeline preview so users immediately understand the system.
- Make the primary CTA specific: `Launch buyer campaign` or `Create social campaign`.

### Live Run

- Introduce a dominant current-step panel at the top.
- Make agent cards feel like progress indicators, not equal-weight content cards.
- Move activity logs below the primary status area.
- Convert `convex.state` into a polished proof panel for judges.
- Make sample mode clear but not visually alarming.

### Result

- Put the generated campaign artifact first.
- Show the rationale as evidence, not as the main content.
- Add edit/regenerate affordances before approval:
  - edit caption
  - regenerate image
  - regenerate angle
  - copy draft
- Keep compliance warnings present but visually secondary.
- Make B2B outreach drafts feel like a review queue, with clear individual and bulk actions.

## Visual Direction

- Use a quieter, more product-like dark interface.
- Reduce orange usage to primary action and active state only.
- Avoid using the same accent treatment for brand, warnings, active states, and technical values.
- Use fewer bordered panels; rely more on spacing, hierarchy, and background contrast.
- Keep monospace labels only for technical proof, logs, and source identifiers.
- Remove unused legacy CSS once the direction is settled.

## Acceptance Criteria

- A first-time viewer can explain the product in under 10 seconds.
- The demo flow clearly shows input, live agent work, sourced proof, generated output, and approval.
- The result page makes the generated campaign the obvious hero.
- Technical proof is visible without making the product feel like a database console.
- The UI feels intentionally designed, not assembled from equal-weight cards.

