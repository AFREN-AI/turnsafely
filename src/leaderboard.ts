import { evaluate, type Annotation } from "./index.js";

export type LeaderboardEntry = {
  system_id: string;
  system_version: string;
  dataset_id: string;
  dataset_revision: string;
  split: string;
  evaluated_samples: number;
  metrics: Record<string, unknown>;
};

/** Produce comparable entries only when run and dataset identity is explicit. */
export function createLeaderboard(rows: Annotation[]): LeaderboardEntry[] {
  const systems = new Map<string, Annotation[]>();
  for (const [index, row] of rows.entries()) {
    for (const field of ["system_id", "system_version", "dataset_id", "dataset_revision", "split"] as const) {
      if (!row[field]?.trim()) throw new TypeError(`row ${index + 1} needs ${field} for leaderboard output`);
    }
    const key = [row.system_id, row.system_version, row.dataset_id, row.dataset_revision, row.split].join("\u0000");
    systems.set(key, [...(systems.get(key) ?? []), row]);
  }
  return [...systems.values()].map((group) => {
    const first = group[0]!;
    return {
      system_id: first.system_id!,
      system_version: first.system_version!,
      dataset_id: first.dataset_id!,
      dataset_revision: first.dataset_revision!,
      split: first.split!,
      evaluated_samples: group.length,
      metrics: evaluate(group),
    };
  }).sort((a, b) => a.system_id.localeCompare(b.system_id) || a.system_version.localeCompare(b.system_version));
}
