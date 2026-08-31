// One-off seeded generator. Run with `node lib/generate-corpus.ts` and paste
// the printed array literal into data/opportunities.ts. Not imported at
// runtime — see PLAN.md's "APIs / data sources" decision for why.
import { AS_OF_DATE, STAGE_ORDER } from "./types.ts";
import type { Activity, ActivityType, Opportunity, Stage, StageTransition } from "./types.ts";

function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(30); // seed = day number in the 100-day series

function pick<T>(pool: T[]): T {
  return pool[Math.floor(rand() * pool.length)];
}

function daysAgo(days: number): string {
  const d = new Date(`${AS_OF_DATE}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const ACCOUNTS = [
  "Northwind Logistics", "Beacon Health", "Solstice Retail", "Fernbank Media",
  "Ledgerline Finance", "Craft & Co", "Granite Manufacturing", "Ashgrove Higher Ed",
  "Harborstack Systems", "Wickerdown Supply", "Cobalt Freight", "Meridian Robotics",
  "Palisade Insurance", "Thistlewood Foods", "Brackenfield Energy", "Silverline Media",
  "Redshank Analytics", "Copperfield Logistics", "Aldergate Capital", "Foxglove Retail",
  "Sparrowhawk Health", "Millbrook Manufacturing", "Quillfeather Media", "Amberwell Insurance",
];

const DEAL_NAME_TEMPLATES = [
  "Platform Expansion", "Annual Renewal + Seats", "New Region Rollout",
  "Pilot to Paid Conversion", "Core Platform Deal", "SMB Starter Package",
  "Multi-Site Rollout", "Add-On Module: Analytics", "Enterprise Migration",
  "District-Wide License", "Renewal at Risk", "Warehouse Automation Suite",
  "Trial Extension Deal", "Global Rollout Phase 2", "Compliance Add-On",
  "Campus Rollout", "Flagship Store Program", "Clinic Network Expansion",
  "Fleet Tracking Add-On", "Regional Bank Deal", "Post-Merger Consolidation",
  "Streaming Rights Renewal", "Franchise Program", "Alumni Portal Upgrade",
];

const FILLER_ACTIVITY_TYPES: ActivityType[] = ["call", "email", "meeting", "note"];

function fullPath(uptoStage: Stage, currentStageAgeDays: number): StageTransition[] {
  const idx = STAGE_ORDER.indexOf(uptoStage);
  const stages = STAGE_ORDER.slice(0, idx + 1);
  return stages.map((stage, i) => ({
    stage,
    enteredDate: daysAgo(currentStageAgeDays + (stages.length - 1 - i) * 7),
  }));
}

function skippedPath(visited: Stage[], currentStageAgeDays: number): StageTransition[] {
  return visited.map((stage, i) => ({
    stage,
    enteredDate: daysAgo(currentStageAgeDays + (visited.length - 1 - i) * 7),
  }));
}

function fillerActivities(count: number, mostRecentDaysAgo: number, spacingDays = 6): Activity[] {
  return Array.from({ length: count }, (_, i) => ({
    type: pick(FILLER_ACTIVITY_TYPES),
    date: daysAgo(mostRecentDaysAgo + i * spacingDays),
  }));
}

type Draft = Pick<Opportunity, "stageHistory" | "activities">;

const drafts: Draft[] = [];

// --- Category A: clean, no flags (12) ---
drafts.push(
  { stageHistory: fullPath("discovery", 3), activities: fillerActivities(2, 3) },
  { stageHistory: fullPath("qualification", 5), activities: fillerActivities(2, 5) },
  { stageHistory: fullPath("demo", 4), activities: fillerActivities(3, 4) },
  { stageHistory: fullPath("proposal", 10), activities: fillerActivities(3, 10) },
  { stageHistory: fullPath("proposal", 20), activities: fillerActivities(2, 20) },
  { stageHistory: fullPath("negotiation", 5), activities: fillerActivities(3, 5) },
  { stageHistory: fullPath("negotiation", 15), activities: fillerActivities(2, 15) },
  {
    stageHistory: fullPath("closed-won", 8),
    activities: [
      { type: "pricing-discussed", date: daysAgo(20) },
      { type: "contract-sent", date: daysAgo(12) },
      { type: "signature-received", date: daysAgo(8) },
    ],
  },
  {
    stageHistory: fullPath("closed-won", 30),
    activities: [
      { type: "contract-sent", date: daysAgo(35) },
      { type: "signature-received", date: daysAgo(30) },
    ],
  },
  { stageHistory: [{ stage: "discovery", enteredDate: daysAgo(6) }, { stage: "closed-lost", enteredDate: daysAgo(2) }], activities: fillerActivities(1, 6) },
  { stageHistory: [{ stage: "discovery", enteredDate: daysAgo(40) }, { stage: "qualification", enteredDate: daysAgo(25) }, { stage: "closed-lost", enteredDate: daysAgo(18) }], activities: fillerActivities(2, 40) },
  { stageHistory: fullPath("qualification", 2), activities: fillerActivities(1, 2) },
);

// --- Category B: stalled-but-advanced-stage only (6: 3 high, 3 medium) ---
drafts.push(
  { stageHistory: fullPath("negotiation", 52), activities: fillerActivities(2, 52) },
  { stageHistory: fullPath("proposal", 60), activities: fillerActivities(2, 60) },
  { stageHistory: fullPath("negotiation", 90), activities: fillerActivities(3, 90) },
  { stageHistory: fullPath("proposal", 34), activities: fillerActivities(2, 34) },
  { stageHistory: fullPath("negotiation", 30), activities: fillerActivities(2, 30) },
  { stageHistory: fullPath("proposal", 41), activities: fillerActivities(2, 41) },
);

// --- Category C: activity-ahead-of-label only (6: 4 high, 2 medium) ---
drafts.push(
  { stageHistory: fullPath("discovery", 5), activities: [...fillerActivities(1, 10), { type: "signature-received", date: daysAgo(5) }] },
  { stageHistory: fullPath("qualification", 4), activities: [...fillerActivities(1, 9), { type: "contract-sent", date: daysAgo(4) }] },
  { stageHistory: fullPath("demo", 3), activities: [...fillerActivities(1, 8), { type: "signature-received", date: daysAgo(3) }] },
  { stageHistory: fullPath("discovery", 6), activities: [...fillerActivities(1, 11), { type: "contract-sent", date: daysAgo(6) }] },
  { stageHistory: fullPath("qualification", 5), activities: [...fillerActivities(1, 9), { type: "pricing-discussed", date: daysAgo(5) }] },
  { stageHistory: fullPath("demo", 4), activities: [...fillerActivities(1, 7), { type: "pricing-discussed", date: daysAgo(4) }] },
);

// --- Category D: stage-skipped only (6: 3 high [2+ missing], 3 medium [1 missing]) ---
drafts.push(
  { stageHistory: skippedPath(["discovery", "negotiation"], 6), activities: fillerActivities(2, 6) },
  { stageHistory: skippedPath(["discovery", "closed-won"], 10), activities: [{ type: "contract-sent", date: daysAgo(14) }, { type: "signature-received", date: daysAgo(10) }] },
  { stageHistory: skippedPath(["qualification", "negotiation"], 8), activities: fillerActivities(3, 8) },
  { stageHistory: skippedPath(["discovery", "qualification", "proposal"], 12), activities: fillerActivities(2, 12) },
  { stageHistory: skippedPath(["discovery", "qualification", "demo", "closed-won"], 9), activities: [{ type: "contract-sent", date: daysAgo(13) }, { type: "signature-received", date: daysAgo(9) }] },
  { stageHistory: skippedPath(["discovery", "demo", "proposal"], 7), activities: fillerActivities(2, 7) },
);

// --- Category E: closed-won-without-evidence only (5) ---
drafts.push(
  { stageHistory: fullPath("closed-won", 5), activities: fillerActivities(2, 5) },
  { stageHistory: fullPath("closed-won", 12), activities: fillerActivities(3, 12) },
  { stageHistory: fullPath("closed-won", 20), activities: [{ type: "pricing-discussed", date: daysAgo(25) }, { type: "call", date: daysAgo(20) }] },
  { stageHistory: fullPath("closed-won", 8), activities: fillerActivities(2, 8) },
  { stageHistory: fullPath("closed-won", 15), activities: fillerActivities(3, 15) },
);

// --- Category F: single-touch-late-stage only, proposal/negotiation only (6) ---
drafts.push(
  { stageHistory: fullPath("negotiation", 4), activities: [] },
  { stageHistory: fullPath("proposal", 3), activities: [] },
  { stageHistory: fullPath("negotiation", 9), activities: [] },
  { stageHistory: fullPath("proposal", 5), activities: [{ type: "call", date: daysAgo(5) }] },
  { stageHistory: fullPath("negotiation", 6), activities: [{ type: "email", date: daysAgo(6) }] },
  { stageHistory: fullPath("proposal", 2), activities: [{ type: "meeting", date: daysAgo(2) }] },
);

// --- Category G: multi-flag combinations (9) ---
// G1: stalled + single-touch (2)
drafts.push(
  { stageHistory: fullPath("negotiation", 40), activities: [{ type: "call", date: daysAgo(40) }] },
  { stageHistory: fullPath("proposal", 55), activities: [{ type: "email", date: daysAgo(55) }] },
);
// G2: stalled + stage-skipped (2)
drafts.push(
  { stageHistory: skippedPath(["discovery", "negotiation"], 50), activities: fillerActivities(2, 50) },
  { stageHistory: skippedPath(["qualification", "proposal"], 46), activities: fillerActivities(2, 46) },
);
// G3: closed-won-without-evidence + stage-skipped (2)
drafts.push(
  { stageHistory: skippedPath(["discovery", "closed-won"], 6), activities: fillerActivities(2, 6) },
  { stageHistory: skippedPath(["discovery", "qualification", "closed-won"], 9), activities: fillerActivities(3, 9) },
);
// G4: activity-ahead-of-label + stage-skipped (2)
drafts.push(
  { stageHistory: skippedPath(["discovery", "demo"], 5), activities: [...fillerActivities(1, 10), { type: "contract-sent", date: daysAgo(5) }] },
  { stageHistory: skippedPath(["qualification", "demo"], 4), activities: [...fillerActivities(1, 9), { type: "pricing-discussed", date: daysAgo(4) }] },
);
// G5: closed-won-without-evidence + single-touch (1)
drafts.push(
  { stageHistory: fullPath("closed-won", 3), activities: [{ type: "call", date: daysAgo(3) }] },
);

if (drafts.length !== 50) {
  throw new Error(`Expected 50 drafts, built ${drafts.length}`);
}

const usedAccounts = new Set<string>();
function nextAccount(): string {
  const available = ACCOUNTS.filter((a) => !usedAccounts.has(a));
  const pool = available.length > 0 ? available : ACCOUNTS;
  const chosen = pick(pool);
  usedAccounts.add(chosen);
  return chosen;
}

const opportunities: Opportunity[] = drafts.map((draft, i) => ({
  id: `opp-${String(i + 1).padStart(2, "0")}`,
  name: pick(DEAL_NAME_TEMPLATES),
  account: nextAccount(),
  amount: Math.round((8000 + rand() * 300000) / 500) * 500,
  ...draft,
}));

const body = opportunities
  .map((o) => {
    const stageHistory = o.stageHistory
      .map((t) => `      { stage: "${t.stage}", enteredDate: "${t.enteredDate}" }`)
      .join(",\n");
    const activities = o.activities
      .map((a) => `      { type: "${a.type}", date: "${a.date}" }`)
      .join(",\n");
    return `  {
    id: "${o.id}",
    name: "${o.name}",
    account: "${o.account}",
    amount: ${o.amount},
    stageHistory: [
${stageHistory}
    ],
    activities: [
${activities}
    ],
  }`;
  })
  .join(",\n");

console.log(`import type { Opportunity } from "@/lib/types";

// Generated by lib/generate-corpus.ts (seed 30). Do not hand-edit — rerun
// the generator and re-paste if the corpus needs to change.
export const opportunities: Opportunity[] = [
${body},
];
`);
