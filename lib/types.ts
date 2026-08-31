// Fixed reference date the whole corpus is evaluated against, so the
// deployed demo's flags never silently change as real time passes.
export const AS_OF_DATE = "2026-08-31";

export type Stage =
  | "discovery"
  | "qualification"
  | "demo"
  | "proposal"
  | "negotiation"
  | "closed-won"
  | "closed-lost";

// Canonical funnel order used for stage-skipped detection. closed-lost is a
// side exit, not part of the ordered path, so it is deliberately excluded.
export const STAGE_ORDER: Stage[] = [
  "discovery",
  "qualification",
  "demo",
  "proposal",
  "negotiation",
  "closed-won",
];

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "contract-sent"
  | "pricing-discussed"
  | "signature-received";

export interface Activity {
  type: ActivityType;
  date: string; // ISO date
}

export interface StageTransition {
  stage: Stage;
  enteredDate: string; // ISO date
}

export interface Opportunity {
  id: string;
  name: string;
  account: string;
  amount: number;
  stageHistory: StageTransition[]; // chronological; last entry is the current stage
  activities: Activity[]; // chronological
}

export type Severity = "high" | "medium";

export type RuleId =
  | "stalled-but-advanced-stage"
  | "activity-ahead-of-label"
  | "stage-skipped"
  | "closed-won-without-evidence"
  | "single-touch-late-stage";

export interface Flag {
  ruleId: RuleId;
  severity: Severity;
  message: string;
  evidence: string[];
}

export interface EvaluatedOpportunity {
  opportunity: Opportunity;
  flags: Flag[];
}

export function currentStage(opportunity: Opportunity): Stage {
  return opportunity.stageHistory[opportunity.stageHistory.length - 1].stage;
}
