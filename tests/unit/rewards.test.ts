import { describe, expect, it } from 'vitest';
import {
  canEquip,
  chestTierForContribution,
  rarityForChestRoll,
  uniqueProgressionEvents,
  xpForActivity,
} from '../../src/domain/rewards';

describe('trwałe nagrody', () => {
  it('does not award the same event twice after recalculation', () => {
    const events = uniqueProgressionEvents(new Set(['rank:spark']), [
      { eventKey: 'rank:spark' },
      { eventKey: 'rank:builder' },
      { eventKey: 'rank:builder' },
    ]);
    expect(events).toEqual([{ eventKey: 'rank:builder' }]);
  });

  it('allows equipping only unlocked cosmetics', () => {
    const unlocked = new Set(['aura-verdant']);
    expect(canEquip('aura-verdant', unlocked)).toBe(true);
    expect(canEquip('title-millionaire', unlocked)).toBe(false);
  });

  it('never gives XP for selling and repurchasing', () => {
    expect(xpForActivity({ kind: 'BUY', stableId: 'buy-1' })).toBe(0);
    expect(xpForActivity({ kind: 'SELL', stableId: 'sell-1' })).toBe(0);
    expect(xpForActivity({ kind: 'CONTRIBUTION', stableId: 'contribution-1' })).toBe(100);
  });

  it('awards better chest tiers for larger external contributions', () => {
    expect(chestTierForContribution('250')).toBe('WOODEN');
    expect(chestTierForContribution('1000')).toBe('SILVER');
    expect(chestTierForContribution('5000')).toBe('GOLD');
  });

  it('uses tier-specific rarity ranges', () => {
    expect(rarityForChestRoll('WOODEN', 59)).toBe('COMMON');
    expect(rarityForChestRoll('WOODEN', 99)).toBe('LEGENDARY');
    expect(rarityForChestRoll('GOLD', 44)).toBe('RARE');
    expect(rarityForChestRoll('GOLD', 84)).toBe('EPIC');
    expect(rarityForChestRoll('GOLD', 85)).toBe('LEGENDARY');
  });
});
