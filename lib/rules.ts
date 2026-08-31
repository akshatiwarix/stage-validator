import { currentStage, STAGE_ORDER } from "./types";
import type { Flag, Opportunity } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(earlier: string, later: string): number {
  return Math.round(
    (new Date(later).getTime() - new Date(earlier).getTime()) / MS_PER_DAY,
  );
}

function mostRecentActivityDate(opportunity: Opportunity): string | null {
  if (opportunity.activities.length === 0) return null;
  return opportunity.activities.reduce((latest, activity) =>
    activity.date > latest.date ? activity : latest,
  ).date;
}

export function checkStalledButAdvancedStage(
  opportunity: Opportunity,
  asOfDate: string,
): Flag | null {
  const stage = currentStage(opportunity);
  if (stage !== "proposal" && stage !== "negotiation") return null;

  const lastActivityDate = mostRecentActivityDate(opportunity);
  if (lastActivityDate === null) return null;

  const daysStale = daysBetween(lastActivityDate, asOfDate);
  if (daysStale < 30) return null;

  return {
    ruleId: "stalled-but-advanced-stage",
    severity: daysStale >= 45 ? "high" : "medium",
    message: `Stage is "${stage}" but the last activity was ${daysStale} days ago.`,
    evidence: [`Last activity: ${lastActivityDate} (${daysStale} days before ${asOfDate})`],
  };
}

const LATE_STAGE_ACTIVITY_TYPES = [
  "contract-sent",
  "pricing-discussed",
  "signature-received",
] as const;

const EARLY_STAGES = ["discovery", "qualification", "demo"] as const;

export function checkActivityAheadOfLabel(
  opportunity: Opportunity,
): Flag | null {
  const stage = currentStage(opportunity);
  if (!EARLY_STAGES.includes(stage as (typeof EARLY_STAGES)[number]))
    return null;

  const lateStageActivities = opportunity.activities.filter((a) =>
    LATE_STAGE_ACTIVITY_TYPES.includes(
      a.type as (typeof LATE_STAGE_ACTIVITY_TYPES)[number],
    ),
  );
  if (lateStageActivities.length === 0) return null;

  const hasHighSeverityActivity = lateStageActivities.some(
    (a) => a.type === "signature-received" || a.type === "contract-sent",
  );

  return {
    ruleId: "activity-ahead-of-label",
    severity: hasHighSeverityActivity ? "high" : "medium",
    message: `Stage is still "${stage}" but the activity log already shows late-stage behavior.`,
    evidence: lateStageActivities.map((a) => `${a.type} on ${a.date}`),
  };
}

export function checkStageSkipped(opportunity: Opportunity): Flag | null {
  const stage = currentStage(opportunity);
  const currentIndex = STAGE_ORDER.indexOf(stage);
  if (currentIndex === -1) return null; // closed-lost: side exit, no expected path

  const expectedStages = STAGE_ORDER.slice(0, currentIndex + 1);
  const visitedStages = new Set(opportunity.stageHistory.map((t) => t.stage));
  const missingStages = expectedStages.filter((s) => !visitedStages.has(s));
  if (missingStages.length === 0) return null;

  return {
    ruleId: "stage-skipped",
    severity: missingStages.length >= 2 ? "high" : "medium",
    message: `Stage history never passed through ${missingStages.join(", ")} on the way to "${stage}".`,
    evidence: [`Stage path: ${opportunity.stageHistory.map((t) => t.stage).join(" -> ")}`],
  };
}

export function checkClosedWonWithoutEvidence(
  opportunity: Opportunity,
): Flag | null {
  const stage = currentStage(opportunity);
  if (stage !== "closed-won") return null;

  const hasCloseEvidence = opportunity.activities.some(
    (a) => a.type === "contract-sent" || a.type === "signature-received",
  );
  if (hasCloseEvidence) return null;

  return {
    ruleId: "closed-won-without-evidence",
    severity: "high",
    message: `Marked "closed-won" but no contract or signature activity was ever logged.`,
    evidence: [`Activity types on record: ${opportunity.activities.map((a) => a.type).join(", ") || "none"}`],
  };
}

const LATE_STAGES = ["proposal", "negotiation", "closed-won"] as const;

export function checkSingleTouchLateStage(
  opportunity: Opportunity,
): Flag | null {
  const stage = currentStage(opportunity);
  if (!LATE_STAGES.includes(stage as (typeof LATE_STAGES)[number]))
    return null;
  if (opportunity.activities.length > 1) return null;

  return {
    ruleId: "single-touch-late-stage",
    severity: "high",
    message: `Stage is "${stage}" off only ${opportunity.activities.length} logged activity.`,
    evidence: [`Total activities on record: ${opportunity.activities.length}`],
  };
}

export function evaluateOpportunity(
  opportunity: Opportunity,
  asOfDate: string,
): Flag[] {
  const flags = [
    checkStalledButAdvancedStage(opportunity, asOfDate),
    checkActivityAheadOfLabel(opportunity),
    checkStageSkipped(opportunity),
    checkClosedWonWithoutEvidence(opportunity),
    checkSingleTouchLateStage(opportunity),
  ];
  return flags.filter((flag): flag is Flag => flag !== null);
}
