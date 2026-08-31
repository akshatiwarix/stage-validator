import type { Flag } from "@/lib/types";

function maxSeverity(flags: Flag[]): "high" | "medium" | null {
  if (flags.some((f) => f.severity === "high")) return "high";
  if (flags.some((f) => f.severity === "medium")) return "medium";
  return null;
}

const SEVERITY_STYLES = {
  high: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
  medium:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  clean:
    "bg-neutral-50 text-neutral-500 ring-neutral-500/10 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-400/20",
};

export function SeverityBadge({ flags }: { flags: Flag[] }) {
  const severity = maxSeverity(flags);

  if (severity === null) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLES.clean}`}
      >
        Clean
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLES[severity]}`}
    >
      {flags.length} contradiction{flags.length === 1 ? "" : "s"}
    </span>
  );
}
