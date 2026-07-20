import { describe, expect, it } from 'vitest';
import { levelThreshold, newlyUnlockedRanks, progressionFor } from '../../src/domain/progression';

describe('Droga do miliona', () => {
  it('assigns every exact level boundary and the value just below it', () => {
    for (let level = 1; level <= 100; level += 1) {
      expect(progressionFor(levelThreshold(level)).currentLevel).toBe(level);
      if (level > 1)
        expect(progressionFor(String(Number(levelThreshold(level)) - 0.01)).currentLevel).toBe(
          level - 1,
        );
    }
  });

  it('reaches exactly level 100 and Milioner at 1,000,000 PLN', () => {
    const result = progressionFor('1000000');
    expect(result.currentLevel).toBe(100);
    expect(result.currentRank.name).toBe('Milioner');
    expect(result.millionProgressPercent).toBe('100');
  });

  it('lets current level fall while preserving highest level', () => {
    const result = progressionFor('1000', 80);
    expect(result.currentLevel).toBe(3);
    expect(result.highestLevel).toBe(80);
  });

  it('returns all simultaneously crossed ranks once for an idempotent event layer', () => {
    const unlocked = newlyUnlockedRanks('999', '50000');
    expect(unlocked.map((rank) => rank.id)).toEqual([
      'spark',
      'builder',
      'investor',
      'strategist',
      'guardian',
    ]);
  });
});
