import { describe, expect, it } from "vitest";
import { opportunities } from "@/data/opportunities";
import { evaluateOpportunity } from "./rules";
import { AS_OF_DATE } from "./types";
import type { RuleId } from "./types";

const evaluated = opportunities.map((o) => ({
  opportunity: o,
  flags: evaluateOpportunity(o, AS_OF_DATE),
}));

const ALL_RULE_IDS: RuleId[] = [
  "stalled-but-advanced-stage",
  "activity-ahead-of-label",
  "stage-skipped",
  "closed-won-without-evidence",
  "single-touch-late-stage",
];

describe("synthetic corpus coverage", () => {
  it("has exactly 50 opportunities", () => {
    expect(opportunities.length).toBe(50);
  });

  it("has unique ids", () => {
    const ids = new Set(opportunities.map((o) => o.id));
    expect(ids.size).toBe(opportunities.length);
  });

  it("has at least 10 clean opportunities (no flags)", () => {
    const clean = evaluated.filter((e) => e.flags.length === 0);
    expect(clean.length).toBeGreaterThanOrEqual(10);
  });

  it.each(ALL_RULE_IDS)("fires rule %s on at least 5 opportunities", (ruleId) => {
    const count = evaluated.filter((e) =>
      e.flags.some((f) => f.ruleId === ruleId),
    ).length;
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it("has at least one opportunity with two or more simultaneous flags", () => {
    const multiFlag = evaluated.filter((e) => e.flags.length >= 2);
    expect(multiFlag.length).toBeGreaterThan(0);
  });
});
