import { describe, expect, it } from 'vitest';
import { calculateEtf, type InvestmentTransaction } from '../../src/domain/etf';

const tx = (patch: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: 'a',
  type: 'BUY',
  executedAt: '2026-01-01T10:00:00Z',
  quantity: '1',
  unitPrice: '100',
  fee: '0',
  currency: 'EUR',
  fxRateToPln: '4',
  ...patch,
});

describe('calculateEtf FIFO', () => {
  it('handles fees, partial sale and changing FX without binary floats', () => {
    const result = calculateEtf(
      [
        tx({ id: 'a', quantity: '10', fee: '5' }),
        tx({
          id: 'b',
          type: 'SELL',
          executedAt: '2026-02-01T10:00:00Z',
          quantity: '4',
          unitPrice: '120',
          fee: '2',
          fxRateToPln: '4.1',
        }),
      ],
      '130',
      '4.2',
    );
    expect(result.quantity).toBe('6');
    expect(result.purchasesAndFeesPln).toBe('4020');
    expect(result.realizedProfitPln).toBe('351.8');
    expect(result.unrealizedProfitPln).toBe('864');
    expect(result.totalProfitPln).toBe('1215.8');
  });

  it('sorts same-time transactions deterministically by id and supports fractions', () => {
    const result = calculateEtf(
      [
        tx({ id: 'b', quantity: '0.25', unitPrice: '20', fxRateToPln: '1' }),
        tx({ id: 'a', quantity: '0.125', unitPrice: '10', fxRateToPln: '1' }),
        tx({ id: 'c', type: 'SELL', quantity: '0.2', unitPrice: '30', fxRateToPln: '1' }),
      ],
      '40',
      '1',
    );
    expect(result.quantity).toBe('0.175');
    expect(result.realizedProfitPln).toBe('3.25');
    expect(result.remainingCostBasisPln).toBe('3.5');
  });

  it('converts every transaction with its explicit FX and includes dividends', () => {
    const result = calculateEtf(
      [
        tx({ id: 'a', quantity: '1', unitPrice: '100', fxRateToPln: '4' }),
        tx({
          id: 'b',
          quantity: '1',
          unitPrice: '100',
          fxRateToPln: '5',
          executedAt: '2026-01-02',
        }),
        tx({
          id: 'c',
          type: 'DIVIDEND',
          quantity: '0',
          unitPrice: '10',
          fee: '1',
          fxRateToPln: '4.5',
          executedAt: '2026-01-03',
        }),
      ],
      '110',
      '4.5',
    );
    expect(result.purchasesAndFeesPln).toBe('900');
    expect(result.dividendsPln).toBe('40.5');
    expect(result.marketValuePln).toBe('990');
    expect(result.totalProfitPln).toBe('130.5');
  });

  it('rejects selling more than the holding', () => {
    expect(() => calculateEtf([tx({ type: 'SELL', quantity: '2' })], '1', '1')).toThrow(/Sprzedaż/);
  });
});
