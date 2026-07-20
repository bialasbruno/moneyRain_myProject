import { describe, expect, it } from 'vitest';
import { bondCreateSchema } from '../../functions/lib/schemas';

const bond = {
  series: 'EDO0736',
  bondType: 'Detaliczne obligacje skarbowe',
  purchaseDate: '2026-07-20',
  maturityDate: '2036-07-20',
  quantity: '10',
  nominalValuePln: '100',
  purchasePricePln: '100',
  interestHandling: 'CAPITALIZE' as const,
  dayCountConvention: 'ACT/ACT' as const,
  notes: '',
};

describe('tworzenie obligacji z pierwszym oprocentowaniem', () => {
  it('przyjmuje obligację i okres zapisane razem', () => {
    const result = bondCreateSchema.safeParse({
      bond,
      firstRate: {
        startDate: '2026-07-20',
        endDate: '2027-07-20',
        annualRatePercent: '6.5',
        handlingOverride: null,
      },
    });

    expect(result.success).toBe(true);
  });

  it('pozwala pominąć pierwszy okres', () => {
    expect(bondCreateSchema.safeParse({ bond, firstRate: null }).success).toBe(true);
  });

  it('odrzuca okres wykraczający poza czas posiadania obligacji', () => {
    const result = bondCreateSchema.safeParse({
      bond,
      firstRate: {
        startDate: '2026-07-19',
        endDate: '2036-07-21',
        annualRatePercent: '6.5',
      },
    });

    expect(result.success).toBe(false);
  });
});
