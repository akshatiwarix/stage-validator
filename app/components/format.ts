import type { Stage } from "@/lib/types";

const STAGE_LABELS: Record<Stage, string> = {
  discovery: "Discovery",
  qualification: "Qualification",
  demo: "Demo",
  proposal: "Proposal",
  negotiation: "Negotiation",
  "closed-won": "Closed Won",
  "closed-lost": "Closed Lost",
};

export function formatStage(stage: Stage): string {
  return STAGE_LABELS[stage];
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}
