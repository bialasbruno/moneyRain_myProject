export type ProgressionActivity =
  | { kind: 'CONTRIBUTION'; stableId: string }
  | { kind: 'GOAL_COMPLETED'; stableId: string }
  | { kind: 'BUY'; stableId: string }
  | { kind: 'SELL'; stableId: string };

export function xpForActivity(activity: ProgressionActivity): number {
  if (activity.kind === 'CONTRIBUTION') return 100;
  if (activity.kind === 'GOAL_COMPLETED') return 250;
  return 0;
}

export function uniqueProgressionEvents<T extends { eventKey: string }>(
  alreadyRecorded: ReadonlySet<string>,
  candidates: T[],
): T[] {
  const seen = new Set(alreadyRecorded);
  return candidates.filter((candidate) => {
    if (seen.has(candidate.eventKey)) return false;
    seen.add(candidate.eventKey);
    return true;
  });
}

export function canEquip(itemId: string, unlockedItemIds: ReadonlySet<string>): boolean {
  return unlockedItemIds.has(itemId);
}
