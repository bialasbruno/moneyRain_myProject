import Decimal from 'decimal.js';
import { D } from './money';

export const MILLION = D(1_000_000);
export const MAX_LEVEL = 100;

export interface Rank {
  id: string;
  thresholdPln: string;
  name: string;
  description: string;
  rewardItemId?: string | null;
}

export const DEFAULT_RANKS: Rank[] = [
  ['novice', 0, 'Nowicjusz'],
  ['spark', 1_000, 'Pierwsza Iskra'],
  ['builder', 5_000, 'Konstruktor'],
  ['investor', 10_000, 'Inwestor'],
  ['strategist', 25_000, 'Strateg'],
  ['guardian', 50_000, 'Strażnik Kapitału'],
  ['architect', 100_000, 'Architekt'],
  ['master', 250_000, 'Mistrz Akumulacji'],
  ['magnate', 500_000, 'Magnat'],
  ['threshold', 750_000, 'Przedproże Miliona'],
  ['millionaire', 1_000_000, 'Milioner'],
].map(([id, threshold, name]) => ({
  id: String(id),
  thresholdPln: String(threshold),
  name: String(name),
  description: `Kamień milowy: ${Number(threshold).toLocaleString('pl-PL')} PLN`,
}));

/** Quadratic curve: level L requires 1,000,000 × (L/100)². */
export function levelThreshold(level: number): string {
  const safe = Math.max(0, Math.min(MAX_LEVEL, Math.trunc(level)));
  return MILLION.mul(D(safe).div(MAX_LEVEL).pow(2)).toDecimalPlaces(2).toString();
}

export function progressionFor(valuePln: string, highestLevel = 0, ranks = DEFAULT_RANKS) {
  const value = Decimal.max(D(valuePln), 0);
  let currentLevel = 0;
  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    if (value.gte(levelThreshold(level))) currentLevel = level;
    else break;
  }
  const nextLevel = Math.min(MAX_LEVEL, currentLevel + 1);
  const floor = D(levelThreshold(currentLevel));
  const ceiling = D(levelThreshold(nextLevel));
  const segmentProgress =
    currentLevel === MAX_LEVEL
      ? D(100)
      : Decimal.min(Decimal.max(value.sub(floor).div(ceiling.sub(floor)).mul(100), 0), 100);
  const sortedRanks = [...ranks].sort((a, b) => D(a.thresholdPln).cmp(b.thresholdPln));
  const currentRank =
    [...sortedRanks].reverse().find((rank) => value.gte(rank.thresholdPln)) ?? sortedRanks[0]!;
  const nextRank = sortedRanks.find((rank) => D(rank.thresholdPln).gt(value)) ?? null;
  return {
    currentLevel,
    highestLevel: Math.max(highestLevel, currentLevel),
    nextLevel,
    levelProgressPercent: segmentProgress.toDecimalPlaces(2).toString(),
    missingToNextLevelPln: DecimalMax(ceiling.sub(value), 0),
    millionProgressPercent: Decimal.min(value.div(MILLION).mul(100), 100)
      .toDecimalPlaces(4)
      .toString(),
    currentRank,
    nextRank,
    missingToNextRankPln: nextRank ? DecimalMax(D(nextRank.thresholdPln).sub(value), 0) : '0',
  };
}

function DecimalMax(value: ReturnType<typeof D>, minimum: number): string {
  return Decimal.max(value, minimum).toDecimalPlaces(2).toString();
}

export function newlyUnlockedRanks(
  previousPeakPln: string,
  currentValuePln: string,
  ranks = DEFAULT_RANKS,
) {
  return ranks.filter(
    (rank) => D(rank.thresholdPln).gt(previousPeakPln) && D(rank.thresholdPln).lte(currentValuePln),
  );
}
