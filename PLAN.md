# Day 030 — Stage Validator — Implementation Plan

> This file is the contract. It was settled before any code was written, through a
> structured grilling session, and it is not a starting point to improve on. If the
> code contradicts this file, the code is wrong. If this file needs to change, it
> changes here first, in writing, with the reason.

**Repo:** `stage-validator` · **Day:** 030 of 100 · **Time limit:** one session (~2-4 hrs)
**Brief (fixed by the master plan):** *A system that compares opportunity stage labels
with actual activity and highlights contradictions.*
**Portfolio angle:** CRM governance, rules, pipeline quality.

---

## Problem

A CRM's stage field is a claim, not a fact. Nothing forces it to agree with what the
activity log actually shows, and three failures repeat across real pipelines:

1. **Stale claims.** A deal sits in "Negotiation" for weeks after the last real touch —
   the stage says active, the activity log says abandoned.
2. **Lagging labels.** A rep sends a contract or discusses pricing but never moves the
   stage field forward — the activity log is ahead of what the CRM reports.
3. **Ungrounded transitions.** A deal reaches "Negotiation" having skipped the stages
   that should have produced evidence along the way, or reaches "Closed Won" with no
   activity that looks like a close.

Nobody catches these by reading a stage column. They only show up by checking the
stage against the deal's own history — which is exactly what this repo automates.

### What this repo is not

- **Not a risk scorer.** Day 022 Pipeline Inspector already owns "is this open deal
  stalled or risky" — a predictive judgment calibrated against a hidden outcome label.
  This repo never predicts risk and never scores. It only checks whether a stage label
  is internally consistent with the activity that produced it — a governance check, not
  a forecast. It reuses Pipeline Inspector's proven shape (deterministic rules, evidence,
  severity) but the UI is a claim-vs-evidence comparison per opportunity, not a ranked
  or scored table.
- **Not connected to any other day's code.** Standalone repo, no shared module.
- **Not a live CRM integration.** A committed synthetic corpus, seeded and reproducible,
  same tradeoff every prior day has documented: ships in one session, zero OAuth setup,
  the rule logic is the point, not the data source.
- **Not an LLM.** Every check is a deterministic rule over structured fields and a dated
  activity log. No model call.
- **No interactive "paste your own opportunity" tester.** Cut for time; listed under
  Post-MVP below.
- **No calibration readout.** Pipeline Inspector's calibration works because it predicts
  a hidden future outcome. This repo's checks are directly verifiable from the data
  itself — there is no hidden ground truth to calibrate against, so including one would
  be copying a feature that doesn't fit this domain.

---

## Intended user

A sales manager or RevOps lead auditing pipeline hygiene, who wants to know which deals
have a stage label that doesn't match their own history — with the exact evidence for
each contradiction, not a vague "this looks off."

---

## User journey

1. Land on a single page listing all 50 synthetic opportunities, each already evaluated
   against 5 rules. No upload, no config.
2. Each row shows account, current stage, amount, and a contradiction badge (count +
   highest severity color) if any rule fired.
3. Click a row to expand a **claim vs evidence** panel: left side is the stage's claim
   (current stage, how long it's been there), right side is what the activity log
   actually shows, and every fired rule is listed underneath with its severity and the
   specific evidence (dates, activity types) that triggered it.
4. Clean opportunities (no rules fired) expand to a plain history view with no flags —
   there for contrast, so "flagged" reads as meaningful rather than default.

---

## MVP scope (user-selected)

Five contradiction rules, applied to a 50-opportunity synthetic corpus, shown on one
page as a list with click-to-expand claim-vs-evidence detail. No live tester, no
calibration readout, no live CRM connection.

## Stack (user-selected)

Next.js 16 + React 19 + Tailwind 4 + TypeScript + Vitest — same stack as every prior
repo in this series. Deployed on Vercel.

## APIs / data sources (user-selected)

None. A committed, seeded synthetic corpus (`data/opportunities.ts`), generated once by
a script and pasted in as a static array — same pattern as `rep-prioritizer`, chosen
over Pipeline Inspector's JSON+zod approach because this repo has no runtime API surface
to validate against; a static typed array is the simpler correct choice here.

## Time limit (user-selected)

One session, ~2-4 hours.

## Deployment plan (user-selected)

Vercel, same as every prior repo. `vercel --prod` once the app is verified locally.

---

## Data model

```ts
type Stage =
  | "discovery"
  | "qualification"
  | "demo"
  | "proposal"
  | "negotiation"
  | "closed-won"
  | "closed-lost";

// Canonical funnel order for skip detection. Closed-lost is a side exit, not
// part of the ordered path.
const STAGE_ORDER: Stage[] = [
  "discovery",
  "qualification",
  "demo",
  "proposal",
  "negotiation",
  "closed-won",
];

type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "contract-sent"
  | "pricing-discussed"
  | "signature-received";

interface Activity {
  type: ActivityType;
  date: string; // ISO date
}

interface StageTransition {
  stage: Stage;
  enteredDate: string; // ISO date
}

interface Opportunity {
  id: string;
  name: string;
  account: string;
  amount: number;
  stageHistory: StageTransition[]; // chronological; last entry is current stage
  activities: Activity[]; // chronological
}
```

`stageHistory` (not just a current-stage field) is what makes stage-skipped detection
possible without tagging every activity with the stage it happened in — the path itself
is the evidence.

Corpus is evaluated against a fixed anchor date baked into the generator (not
`Date.now()`), so results are reproducible indefinitely and the deployed demo never
silently changes behavior as real time passes.

---

## Rules

Each rule is a pure function `(Opportunity, asOfDate) => Flag | null`. A `Flag` carries
`ruleId`, `severity` (`"high" | "medium"`), a human-readable `message`, and `evidence`
(the specific dates/activity types that fired it).

1. **stalled-but-advanced-stage** — current stage ∈ {proposal, negotiation} AND days
   since the most recent activity ≥ 30.
   Severity: ≥45 days → high, 30-44 days → medium.

2. **activity-ahead-of-label** — current stage ∈ {discovery, qualification, demo} AND
   the activity log contains `contract-sent`, `pricing-discussed`, or
   `signature-received`.
   Severity: `signature-received` or `contract-sent` → high, `pricing-discussed` →
   medium.

3. **stage-skipped** — walking `stageHistory` in order, one or more stages from
   `STAGE_ORDER` between `discovery` and the current stage never appears.
   Severity: 2+ stages skipped → high, exactly 1 → medium.

4. **closed-won-without-evidence** — current stage is `closed-won` AND the activity log
   contains no `contract-sent` and no `signature-received`.
   Severity: always high.

5. **single-touch-late-stage** — current stage ∈ {proposal, negotiation, closed-won} AND
   total activity count ≤ 1 across the opportunity's entire history.
   Severity: always high.

An opportunity's overall badge is the count of fired flags, colored by the highest
severity among them.

---

## Main states and workflows

- **List view (default):** all 50 opportunities, each row collapsed, badge visible.
- **Row expanded:** claim-vs-evidence panel open for that one opportunity; other rows
  stay collapsed (single-expand or multi-expand — implementer's call, no user-facing
  contract either way).
- **Clean opportunity expanded:** same panel shape, empty flag list, so "no
  contradictions" is a vis密ble, deliberate state, not the absence of a UI.
- No loading states, no error states — static data, nothing can fail at runtime.

---

## Implementation task order

Each task ends in a commit and a push. Small steps, verified before moving on.

1. **Scaffold.** `create-next-app` (TS, Tailwind, ESLint, App Router), add Vitest, add
   this `PLAN.md`, `LICENSE` (MIT), `.gitignore`, initial `git init` + GitHub repo.
   Verify: `npm run dev` serves the default page.
2. **Domain types** — `lib/types.ts`: `Stage`, `STAGE_ORDER`, `ActivityType`,
   `Activity`, `StageTransition`, `Opportunity`, `Flag`, `RuleId`.
   Verify: `tsc --noEmit` passes.
3. **Rules engine** — `lib/rules.ts` + `lib/rules.test.ts`, TDD: a failing test per rule
   (including a negative case — the rule does NOT fire on a clean opportunity) before
   the implementation. Plus `evaluateOpportunity()` that runs all 5 and returns the
   fired flags.
   Verify: `npm test` green.
4. **Synthetic corpus** — `lib/generate-corpus.ts` (seeded PRNG, run once, output pasted
   into `data/opportunities.ts`), plus `lib/corpus.test.ts` asserting coverage
   invariants: at least 5 opportunities trigger each of the 5 rules, at least 10 are
   clean, exactly 50 total.
   Verify: `npm test` green, invariants hold.
5. **List UI** — `app/page.tsx`, `app/components/OpportunityRow.tsx`,
   `app/components/SeverityBadge.tsx`: renders all 50, account/stage/amount, badge.
   Verify: manual browser check, all 50 render, badges match `evaluateOpportunity`
   output.
6. **Detail UI** — `app/components/ContradictionPanel.tsx`: click-to-expand
   claim-vs-evidence layout, every fired flag listed with evidence and severity; clean
   state renders the empty-flags view.
   Verify: manual browser check — expand a flagged row and a clean row, confirm both
   read correctly, no console errors.
7. **README + screenshots** — using the master plan's reusable README structure;
   screenshots taken from the running local app.
8. **Deploy** — `vercel --prod`, confirm the live URL renders correctly, add the Live
   Demo link to the README.

---

## Validation / test plan

- `lib/rules.test.ts` — unit tests per rule: fires on the exact triggering condition,
  does not fire just below threshold, correct severity at the boundary.
- `lib/corpus.test.ts` — corpus-wide invariants (rule coverage, clean-opportunity count,
  total count), so the demo can never silently regress to "nothing is flagged" or
  "everything is flagged."
- Manual browser pass covering: full list renders, badge count matches computed flags
  for a sample of rows, expand/collapse works, a clean opportunity's expanded state
  reads correctly, no console errors on load.

## Definition of done

- All 5 rules implemented and unit-tested.
- 50-opportunity corpus committed, coverage invariants passing.
- List + claim-vs-evidence detail view working end to end in a browser.
- Deployed to Vercel, live URL working.
- README complete per the master plan's structure, with screenshots.
- Day 030 checkbox marked complete in the master `100-days-portfolio-execution-plan.md`
  once the above is confirmed shipped.

---

## Post-MVP ideas (not in this session's scope)

- Interactive "paste/edit an opportunity" live tester (Pipeline Inspector's Try It
  Yourself, adapted to this rule set).
- Stage-regression detection (deal moves backward) — cut because it's often legitimate
  (e.g., a deal getting re-qualified), not a reliable contradiction signal on its own.
- Configurable thresholds (the 30-day stall window, severity bands) exposed as UI
  controls instead of fixed constants.
- CSV import for a user's own opportunity export.
