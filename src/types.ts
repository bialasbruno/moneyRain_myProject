export type MarketStatus = 'LIVE' | 'DELAYED' | 'CLOSED' | 'STALE' | 'MANUAL';

export interface Instrument {
  id: string;
  name: string;
  symbol: string;
  providerSymbol: string;
  exchange: string;
  mic: string | null;
  isin: string | null;
  quoteCurrency: string;
  baseCurrency: string;
  quoteProvider: 'MANUAL' | 'TWELVE_DATA';
  manualPrice: string | null;
}

export interface Transaction {
  id: string;
  instrumentId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'FEE';
  executedAt: string;
  quantity: string;
  unitPrice: string;
  fee: string;
  currency: string;
  fxRateToPln: string;
  notes?: string | null;
}

export interface Bond {
  id: string;
  series: string;
  bondType: string;
  purchaseDate: string;
  maturityDate: string;
  quantity: string;
  nominalValuePln: string;
  purchasePricePln: string;
  interestHandling: 'CAPITALIZE' | 'PAY_OUT';
  dayCountConvention: 'ACT/365' | 'ACT/ACT' | '30E/360';
  notes?: string | null;
}

export interface Progression {
  currentLevel: number;
  highestLevel: number;
  nextLevel: number;
  levelProgressPercent: string;
  missingToNextLevelPln: string;
  millionProgressPercent: string;
  currentRank: { id: string; name: string; thresholdPln: string; description: string };
  nextRank: { id: string; name: string; thresholdPln: string; description: string } | null;
  missingToNextRankPln: string;
  effectsLevel: 'FULL' | 'LIMITED' | 'OFF';
  soundEnabled: boolean;
}

export interface DashboardData {
  asOf: string;
  totalValuePln: string;
  totalProfitPln: string;
  returnPercent: string;
  etfValuePln: string;
  bondsValuePln: string;
  accruedInterestPln: string;
  dailyChangePln: string | null;
  allocation: { etfPercent: string; bondsPercent: string };
  quotes: Array<{
    instrumentId: string;
    symbol: string;
    price?: string;
    currency?: string;
    provider?: string;
    quotedAt?: string;
    marketStatus?: MarketStatus;
    staleReason?: string;
    fxMissing?: boolean;
  }>;
  bonds: Array<
    Bond & {
      valuation: { missingRate: boolean; accruedInterestPln: string; currentValuePln: string };
    }
  >;
  game: Progression;
}

export interface ApiErrorBody {
  error?: { code: string; message: string; requestId: string };
}
