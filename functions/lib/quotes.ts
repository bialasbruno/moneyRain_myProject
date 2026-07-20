import { HttpError } from './http';
import type { Env } from './types';

export type MarketStatus = 'LIVE' | 'DELAYED' | 'CLOSED' | 'STALE' | 'MANUAL';

export interface QuoteResult {
  name: string;
  symbol: string;
  exchange: string;
  currency: string;
  price: string;
  previousClose?: string;
  quotedAt: string;
  receivedAt: string;
  marketStatus: MarketStatus;
  dataDelaySeconds: number;
  provider: string;
  staleReason?: string;
}

export interface QuoteInstrument {
  id: string;
  name: string;
  symbol: string;
  provider_symbol: string;
  exchange: string;
  mic: string | null;
  quote_currency: string;
  quote_provider: 'MANUAL' | 'TWELVE_DATA';
  manual_price: string | null;
  manual_price_updated_at: string | null;
}

export interface QuoteProvider {
  getQuote(instrument: QuoteInstrument): Promise<QuoteResult>;
}

export class ManualQuoteProvider implements QuoteProvider {
  async getQuote(instrument: QuoteInstrument): Promise<QuoteResult> {
    if (!instrument.manual_price)
      throw new HttpError(422, 'MISSING_MANUAL_PRICE', 'Brak ceny ręcznej.');
    const now = new Date().toISOString();
    return {
      name: instrument.name,
      symbol: instrument.symbol,
      exchange: instrument.exchange,
      currency: instrument.quote_currency,
      price: instrument.manual_price,
      quotedAt: instrument.manual_price_updated_at ?? now,
      receivedAt: now,
      marketStatus: 'MANUAL',
      dataDelaySeconds: 0,
      provider: 'Manual',
    };
  }
}

export class TwelveDataQuoteProvider implements QuoteProvider {
  constructor(private readonly apiKey: string) {}

  async getQuote(instrument: QuoteInstrument): Promise<QuoteResult> {
    const url = new URL('https://api.twelvedata.com/quote');
    url.searchParams.set('symbol', instrument.provider_symbol);
    if (instrument.exchange) url.searchParams.set('exchange', instrument.exchange);
    if (instrument.mic) url.searchParams.set('mic_code', instrument.mic);
    const response = await fetch(url, {
      headers: { Authorization: `apikey ${this.apiKey}`, Accept: 'application/json' },
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok || data.status === 'error') {
      throw new HttpError(502, 'QUOTE_PROVIDER_ERROR', 'Dostawca notowań nie zwrócił ceny.');
    }
    const price = String(data.close ?? '');
    if (!/^\d+(?:\.\d+)?$/.test(price)) {
      throw new HttpError(502, 'INVALID_QUOTE', 'Dostawca zwrócił nieprawidłową cenę.');
    }
    const receivedAt = new Date().toISOString();
    const timestamp = Number(data.last_quote_at ?? data.timestamp ?? 0);
    const quotedAt = timestamp > 0 ? new Date(timestamp * 1000).toISOString() : receivedAt;
    const delay = Math.max(0, Math.round((Date.now() - new Date(quotedAt).getTime()) / 1000));
    const isOpen = data.is_market_open === true;
    return {
      name: String(data.name ?? instrument.name),
      symbol: String(data.symbol ?? instrument.symbol),
      exchange: String(data.exchange ?? instrument.exchange),
      currency: String(data.currency ?? instrument.quote_currency),
      price,
      previousClose:
        typeof data.previous_close === 'string' && /^\d+(?:\.\d+)?$/.test(data.previous_close)
          ? data.previous_close
          : undefined,
      quotedAt,
      receivedAt,
      marketStatus: isOpen ? (delay > 900 ? 'DELAYED' : 'LIVE') : 'CLOSED',
      dataDelaySeconds: delay,
      provider: 'Twelve Data',
    };
  }
}

export async function quoteFor(
  env: Env,
  instrument: QuoteInstrument,
  force = false,
): Promise<QuoteResult> {
  const cached = await env.DB.prepare('SELECT * FROM quote_cache WHERE instrument_id = ?')
    .bind(instrument.id)
    .first<Record<string, unknown>>();
  if (!force && cached && Date.now() - new Date(String(cached.received_at)).getTime() < 60_000) {
    return fromCache(cached);
  }
  try {
    const provider: QuoteProvider =
      instrument.quote_provider === 'MANUAL'
        ? new ManualQuoteProvider()
        : new TwelveDataQuoteProvider(
            env.MARKET_DATA_API_KEY ??
              (() => {
                throw new HttpError(
                  503,
                  'QUOTE_NOT_CONFIGURED',
                  'Dostawca notowań nie jest skonfigurowany.',
                );
              })(),
          );
    const result = await provider.getQuote(instrument);
    await env.DB.prepare(
      `INSERT INTO quote_cache (instrument_id, price, previous_close, currency, provider, quoted_at, received_at, market_status, data_delay_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(instrument_id) DO UPDATE SET price=excluded.price, previous_close=excluded.previous_close, currency=excluded.currency,
       provider=excluded.provider, quoted_at=excluded.quoted_at, received_at=excluded.received_at,
       market_status=excluded.market_status, data_delay_seconds=excluded.data_delay_seconds`,
    )
      .bind(
        instrument.id,
        result.price,
        result.previousClose ?? null,
        result.currency,
        result.provider,
        result.quotedAt,
        result.receivedAt,
        result.marketStatus,
        result.dataDelaySeconds,
      )
      .run();
    return result;
  } catch (error) {
    if (!cached) throw error;
    return {
      ...fromCache(cached),
      marketStatus: 'STALE',
      staleReason: 'Pokazujemy ostatnią poprawną cenę.',
    };
  }
}

function fromCache(row: Record<string, unknown>): QuoteResult {
  return {
    name: '',
    symbol: '',
    exchange: '',
    price: String(row.price),
    previousClose: row.previous_close ? String(row.previous_close) : undefined,
    currency: String(row.currency),
    provider: String(row.provider),
    quotedAt: String(row.quoted_at),
    receivedAt: String(row.received_at),
    marketStatus: String(row.market_status) as MarketStatus,
    dataDelaySeconds: Number(row.data_delay_seconds),
  };
}
