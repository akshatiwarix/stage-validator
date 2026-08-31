import { describe, expect, it } from "vitest";
import {
  checkActivityAheadOfLabel,
  checkClosedWonWithoutEvidence,
  checkSingleTouchLateStage,
  checkStageSkipped,
  checkStalledButAdvancedStage,
  evaluateOpportunity,
} from "./rules";
import type { Activity, Opportunity, StageTransition } from "./types";

const AS_OF = "2026-08-31";

function opp(
  stageHistory: StageTransition[],
  activities: Activity[] = [],
): Opportunity {
  return {
    id: "test-opp",
    name: "Test Opportunity",
    account: "Test Account",
    amount: 10000,
    stageHistory,
    activities,
  };
}

describe("checkStalledButAdvancedStage", () => {
  it("fires high when the most recent activity is 45+ days before asOf, in negotiation", () => {
    const o = opp(
      [{ stage: "negotiation", enteredDate: "2026-07-01" }],
      [{ type: "call", date: "2026-07-10" }], // 52 days before AS_OF
    );
    const flag = checkStalledButAdvancedStage(o, AS_OF);
    expect(flag?.severity).toBe("high");
  });

  it("fires medium between 30 and 44 days stale, in proposal", () => {
    const o = opp(
      [{ stage: "proposal", enteredDate: "2026-07-01" }],
      [{ type: "email", date: "2026-07-28" }], // 34 days before AS_OF
    );
    const flag = checkStalledButAdvancedStage(o, AS_OF);
    expect(flag?.severity).toBe("medium");
  });

  it("does not fire just under the 30-day threshold", () => {
    const o = opp(
      [{ stage: "negotiation", enteredDate: "2026-08-01" }],
      [{ type: "call", date: "2026-08-02" }], // 29 days before AS_OF
    );
    expect(checkStalledButAdvancedStage(o, AS_OF)).toBeNull();
  });

  it("does not fire outside proposal/negotiation stages", () => {
    const o = opp(
      [{ stage: "discovery", enteredDate: "2026-06-01" }],
      [{ type: "call", date: "2026-06-01" }],
    );
    expect(checkStalledButAdvancedStage(o, AS_OF)).toBeNull();
  });

  it("does not fire with zero activities (single-touch owns that case)", () => {
    const o = opp([{ stage: "negotiation", enteredDate: "2026-06-01" }], []);
    expect(checkStalledButAdvancedStage(o, AS_OF)).toBeNull();
  });
});

describe("checkActivityAheadOfLabel", () => {
  it("fires high when signature-received appears while still in discovery", () => {
    const o = opp(
      [{ stage: "discovery", enteredDate: "2026-08-01" }],
      [{ type: "signature-received", date: "2026-08-10" }],
    );
    expect(checkActivityAheadOfLabel(o)?.severity).toBe("high");
  });

  it("fires high when contract-sent appears while still in qualification", () => {
    const o = opp(
      [{ stage: "qualification", enteredDate: "2026-08-01" }],
      [{ type: "contract-sent", date: "2026-08-10" }],
    );
    expect(checkActivityAheadOfLabel(o)?.severity).toBe("high");
  });

  it("fires medium when only pricing-discussed appears early", () => {
    const o = opp(
      [{ stage: "demo", enteredDate: "2026-08-01" }],
      [{ type: "pricing-discussed", date: "2026-08-10" }],
    );
    expect(checkActivityAheadOfLabel(o)?.severity).toBe("medium");
  });

  it("does not fire once the stage has caught up to negotiation", () => {
    const o = opp(
      [{ stage: "negotiation", enteredDate: "2026-08-01" }],
      [{ type: "contract-sent", date: "2026-08-10" }],
    );
    expect(checkActivityAheadOfLabel(o)).toBeNull();
  });
});

describe("checkStageSkipped", () => {
  it("fires high when two or more stages were never visited", () => {
    const o = opp([
      { stage: "discovery", enteredDate: "2026-06-01" },
      { stage: "negotiation", enteredDate: "2026-07-01" },
    ]);
    // skips qualification, demo, proposal — 3 missing
    expect(checkStageSkipped(o)?.severity).toBe("high");
  });

  it("fires medium when exactly one stage was never visited", () => {
    const o = opp([
      { stage: "discovery", enteredDate: "2026-06-01" },
      { stage: "qualification", enteredDate: "2026-06-10" },
      { stage: "proposal", enteredDate: "2026-07-01" },
    ]);
    // skips demo — 1 missing
    expect(checkStageSkipped(o)?.severity).toBe("medium");
  });

  it("does not fire when every stage up to the current one was visited", () => {
    const o = opp([
      { stage: "discovery", enteredDate: "2026-06-01" },
      { stage: "qualification", enteredDate: "2026-06-10" },
      { stage: "demo", enteredDate: "2026-06-20" },
      { stage: "proposal", enteredDate: "2026-07-01" },
    ]);
    expect(checkStageSkipped(o)).toBeNull();
  });

  it("does not fire for closed-lost (a side exit, not part of the ordered path)", () => {
    const o = opp([
      { stage: "discovery", enteredDate: "2026-06-01" },
      { stage: "closed-lost", enteredDate: "2026-06-05" },
    ]);
    expect(checkStageSkipped(o)).toBeNull();
  });
});

describe("checkClosedWonWithoutEvidence", () => {
  it("fires high when closed-won has no contract or signature activity", () => {
    const o = opp(
      [{ stage: "closed-won", enteredDate: "2026-08-01" }],
      [{ type: "call", date: "2026-08-01" }],
    );
    expect(checkClosedWonWithoutEvidence(o)?.severity).toBe("high");
  });

  it("does not fire when signature-received is present", () => {
    const o = opp(
      [{ stage: "closed-won", enteredDate: "2026-08-01" }],
      [{ type: "signature-received", date: "2026-08-01" }],
    );
    expect(checkClosedWonWithoutEvidence(o)).toBeNull();
  });

  it("does not fire for stages other than closed-won", () => {
    const o = opp([{ stage: "negotiation", enteredDate: "2026-08-01" }], []);
    expect(checkClosedWonWithoutEvidence(o)).toBeNull();
  });
});

describe("checkSingleTouchLateStage", () => {
  it("fires high in negotiation with zero activities", () => {
    const o = opp([{ stage: "negotiation", enteredDate: "2026-08-01" }], []);
    expect(checkSingleTouchLateStage(o)?.severity).toBe("high");
  });

  it("fires high in proposal with exactly one activity", () => {
    const o = opp(
      [{ stage: "proposal", enteredDate: "2026-08-01" }],
      [{ type: "call", date: "2026-08-01" }],
    );
    expect(checkSingleTouchLateStage(o)?.severity).toBe("high");
  });

  it("does not fire with two or more activities", () => {
    const o = opp(
      [{ stage: "negotiation", enteredDate: "2026-08-01" }],
      [
        { type: "call", date: "2026-08-01" },
        { type: "email", date: "2026-08-05" },
      ],
    );
    expect(checkSingleTouchLateStage(o)).toBeNull();
  });

  it("does not fire in early stages", () => {
    const o = opp([{ stage: "discovery", enteredDate: "2026-08-01" }], []);
    expect(checkSingleTouchLateStage(o)).toBeNull();
  });
});

describe("evaluateOpportunity", () => {
  it("returns no flags for a clean opportunity", () => {
    const o = opp(
      [
        { stage: "discovery", enteredDate: "2026-06-01" },
        { stage: "qualification", enteredDate: "2026-06-10" },
        { stage: "demo", enteredDate: "2026-06-20" },
        { stage: "proposal", enteredDate: "2026-07-01" },
      ],
      [
        { type: "call", date: "2026-08-20" },
        { type: "email", date: "2026-08-25" },
      ],
    );
    expect(evaluateOpportunity(o, AS_OF)).toEqual([]);
  });

  it("collects every rule that fires, not just the first", () => {
    const o = opp(
      [{ stage: "negotiation", enteredDate: "2026-07-01" }],
      [{ type: "call", date: "2026-07-05" }], // stale AND single-touch AND skipped
    );
    const ruleIds = evaluateOpportunity(o, AS_OF).map((f) => f.ruleId);
    expect(ruleIds).toContain("stalled-but-advanced-stage");
    expect(ruleIds).toContain("single-touch-late-stage");
    expect(ruleIds).toContain("stage-skipped");
  });
});
