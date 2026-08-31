import type { EvaluatedOpportunity } from "@/lib/types";
import { AS_OF_DATE, currentStage } from "@/lib/types";
import { daysBetween } from "@/lib/rules";
import { formatDate, formatStage } from "./format";

const SEVERITY_TEXT = {
  high: "text-red-700 dark:text-red-300",
  medium: "text-amber-700 dark:text-amber-300",
};

export function ContradictionPanel({ opportunity, flags }: EvaluatedOpportunity) {
  const stage = currentStage(opportunity);
  const currentTransition =
    opportunity.stageHistory[opportunity.stageHistory.length - 1];
  const daysInStage = daysBetween(currentTransition.enteredDate, AS_OF_DATE);

  const lastActivity =
    opportunity.activities.length > 0
      ? opportunity.activities.reduce((latest, a) =>
          a.date > latest.date ? a : latest,
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Claim — stage
          </h3>
          <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
            {formatStage(stage)}, entered {formatDate(currentTransition.enteredDate)}{" "}
            ({daysInStage} day{daysInStage === 1 ? "" : "s"} ago)
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Path: {opportunity.stageHistory.map((t) => formatStage(t.stage)).join(" → ")}
          </p>
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Evidence — activity log
          </h3>
          {lastActivity === null ? (
            <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
              No activity ever logged.
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
              Last activity: {lastActivity.type} on {formatDate(lastActivity.date)}
            </p>
          )}
          <ul className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {opportunity.activities.length === 0 && <li>No activities on record.</li>}
            {[...opportunity.activities]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((a, i) => (
                <li key={i}>
                  {a.type} — {formatDate(a.date)}
                </li>
              ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Contradictions
        </h3>
        {flags.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            No contradictions — stage and activity history agree.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {flags.map((flag) => (
              <li key={flag.ruleId} className="text-sm">
                <p className={`font-medium ${SEVERITY_TEXT[flag.severity]}`}>
                  {flag.severity} — {flag.message}
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-neutral-500 dark:text-neutral-400">
                  {flag.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
