import { describe, expect, it } from 'vitest';
import { calculateBond, yearFraction, type BondLotInput } from '../../src/domain/bonds';

const lot = (patch: Partial<BondLotInput> = {}): BondLotInput => ({
  purchaseDate: '2023-01-01',
  maturityDate: '2026-01-01',
  quantity: '10',
  nominalValuePln: '100',
  purchasePricePln: '100',
  interestHandling: 'CAPITALIZE',
  dayCountConvention: 'ACT/365',
  periods: [],
  ...patch,
});

describe('bond engine', () => {
  it('handles leap years in ACT/ACT', () => {
    expect(yearFraction('2024-01-01', '2025-01-01', 'ACT/ACT').toString()).toBe('1');
    expect(yearFraction('2023-07-01', '2024-07-01', 'ACT/ACT').toNumber()).toBeCloseTo(1.00138, 4);
  });

  it('handles 30E/360 and period boundaries', () => {
    expect(yearFraction('2026-01-31', '2026-02-28', '30E/360').toString()).toBe(
      '0.07777777777777777777777777777777777777778',
    );
    expect(yearFraction('2026-03-01', '2026-03-01', 'ACT/365').toString()).toBe('0');
  });

  it('capitalizes complete periods and accrues an incomplete period', () => {
    const result = calculateBond(
      lot({
        periods: [
          { id: 'a', startDate: '2023-01-01', endDate: '2024-01-01', annualRatePercent: '10' },
          { id: 'b', startDate: '2024-01-01', endDate: '2025-01-01', annualRatePercent: '10' },
        ],
      }),
      '2024-07-02',
    );
    expect(result.capitalizedInterestPln).toBe('100');
    expect(Number(result.accruedInterestPln)).toBeCloseTo(55.15, 2);
    expect(Number(result.currentValuePln)).toBeCloseTo(1155.15, 2);
  });

  it('keeps paid-out interest outside current value', () => {
    const result = calculateBond(
      lot({
        interestHandling: 'PAY_OUT',
        periods: [
          { id: 'a', startDate: '2023-01-01', endDate: '2024-01-01', annualRatePercent: '5' },
        ],
      }),
      '2024-02-01',
    );
    expect(result.currentValuePln).toBe('1000');
    expect(result.paidOutInterestPln).toBe('50');
    expect(result.profitPln).toBe('50');
  });

  it('reports missing rate rather than predicting it', () => {
    const result = calculateBond(lot(), '2025-01-01');
    expect(result.missingRate).toBe(true);
    expect(result.accruedInterestPln).toBe('0');
  });
});
