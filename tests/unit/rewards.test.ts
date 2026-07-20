import { describe, expect, it } from 'vitest';
import { canEquip, uniqueProgressionEvents, xpForActivity } from '../../src/domain/rewards';

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
});
