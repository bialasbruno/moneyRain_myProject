import { describe, expect, it } from 'vitest';
import { ManualQuoteProvider, quoteFor, type QuoteInstrument } from '../../functions/lib/quotes';
import type { Env } from '../../functions/lib/types';

const instrument: QuoteInstrument = {
  id: '1',
  name: 'ETF',
  symbol: 'ETF',
  provider_symbol: 'ETF',
  exchange: 'Xetra',
  mic: 'XETR',
  quote_currency: 'EUR',
  quote_provider: 'MANUAL',
  manual_price: '123.45',
  manual_price_updated_at: '2026-07-20T10:00:00Z',
};

describe('quote providers', () => {
  it('always supports an explicit manual quote', async () => {
    const result = await new ManualQuoteProvider().getQuote(instrument);
    expect(result.price).toBe('123.45');
    expect(result.marketStatus).toBe('MANUAL');
  });

  it('returns last successful price as STALE when provider is unavailable', async () => {
    const cached = {
      price: '98.10',
      currency: 'EUR',
      provider: 'Twelve Data',
      quoted_at: '2026-07-19T10:00:00Z',
      received_at: '2026-07-19T10:00:00Z',
      market_status: 'CLOSED',
      data_delay_seconds: 60,
    };
    const db = {
      prepare: () => ({ bind: () => ({ first: async () => cached }) }),
    } as unknown as D1Database;
    const result = await quoteFor(
      { DB: db } as Env,
      { ...instrument, quote_provider: 'TWELVE_DATA' },
      true,
    );
    expect(result.price).toBe('98.10');
    expect(result.marketStatus).toBe('STALE');
    expect(result.staleReason).toMatch(/ostatnią/);
  });
});
