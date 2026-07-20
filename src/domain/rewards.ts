import { D } from './money';

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

export type ChestTier = 'WOODEN' | 'SILVER' | 'GOLD';
export type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export function chestTierForContribution(amountPln: string): ChestTier {
  const amount = D(amountPln);
  if (amount.gte(5_000)) return 'GOLD';
  if (amount.gte(1_000)) return 'SILVER';
  return 'WOODEN';
}

export function rarityForChestRoll(tier: ChestTier, roll: number): ItemRarity {
  const normalized = Math.max(0, Math.min(99, Math.trunc(roll)));
  if (tier === 'GOLD') {
    if (normalized < 10) return 'COMMON';
    if (normalized < 45) return 'RARE';
    if (normalized < 85) return 'EPIC';
    return 'LEGENDARY';
  }
  if (tier === 'SILVER') {
    if (normalized < 30) return 'COMMON';
    if (normalized < 75) return 'RARE';
    if (normalized < 95) return 'EPIC';
    return 'LEGENDARY';
  }
  if (normalized < 60) return 'COMMON';
  if (normalized < 90) return 'RARE';
  if (normalized < 99) return 'EPIC';
  return 'LEGENDARY';
}
