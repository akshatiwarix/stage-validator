"use client";

import { useState } from "react";
import type { EvaluatedOpportunity } from "@/lib/types";
import { currentStage } from "@/lib/types";
import { formatCurrency, formatStage } from "./format";
import { SeverityBadge } from "./SeverityBadge";
import { ContradictionPanel } from "./ContradictionPanel";

export function OpportunityRow({ opportunity, flags }: EvaluatedOpportunity) {
  const [expanded, setExpanded] = useState(false);
  const stage = currentStage(opportunity);

  return (
    <li className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {opportunity.name}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {opportunity.account}
          </p>
        </div>
        <span className="w-28 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
          {formatStage(stage)}
        </span>
        <span className="w-24 shrink-0 text-right text-sm text-neutral-600 dark:text-neutral-400">
          {formatCurrency(opportunity.amount)}
        </span>
        <span className="w-36 shrink-0 text-right">
          <SeverityBadge flags={flags} />
        </span>
        <span
          className="shrink-0 text-neutral-400 transition-transform dark:text-neutral-600"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}
          aria-hidden
        >
          ›
        </span>
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-900 dark:bg-neutral-950">
          <ContradictionPanel opportunity={opportunity} flags={flags} />
        </div>
      )}
    </li>
  );
}
