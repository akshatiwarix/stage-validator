"use client";

import { useMemo } from "react";
import { opportunities } from "@/data/opportunities";
import { evaluateOpportunity } from "@/lib/rules";
import { AS_OF_DATE } from "@/lib/types";
import { OpportunityRow } from "./components/OpportunityRow";

export default function Home() {
  const evaluated = useMemo(
    () =>
      opportunities.map((opportunity) => ({
        opportunity,
        flags: evaluateOpportunity(opportunity, AS_OF_DATE),
      })),
    [],
  );

  const flaggedCount = evaluated.filter((e) => e.flags.length > 0).length;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Stage Validator
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Compares each opportunity&apos;s stage label against its own
          activity history and flags where they disagree. Click a row for
          the evidence.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Pipeline — {evaluated.length} opportunities, {flaggedCount} flagged
        </h2>
        <ul className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          {evaluated.map((e) => (
            <OpportunityRow
              key={e.opportunity.id}
              opportunity={e.opportunity}
              flags={e.flags}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
