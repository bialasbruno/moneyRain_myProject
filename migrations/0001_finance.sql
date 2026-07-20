PRAGMA foreign_keys = ON;

CREATE TABLE instruments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
  symbol TEXT NOT NULL CHECK(length(symbol) BETWEEN 1 AND 24),
  provider_symbol TEXT NOT NULL CHECK(length(provider_symbol) BETWEEN 1 AND 80),
  exchange TEXT NOT NULL CHECK(length(exchange) <= 80),
  mic TEXT CHECK(length(mic) <= 12),
  isin TEXT CHECK(length(isin) <= 12),
  quote_currency TEXT NOT NULL CHECK(length(quote_currency) = 3),
  base_currency TEXT NOT NULL CHECK(length(base_currency) = 3),
  quote_provider TEXT NOT NULL CHECK(quote_provider IN ('MANUAL', 'TWELVE_DATA')),
  manual_price TEXT,
  manual_price_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE UNIQUE INDEX instruments_isin_idx ON instruments(isin) WHERE isin IS NOT NULL;
CREATE INDEX instruments_symbol_idx ON instruments(symbol, exchange);

CREATE TABLE investment_transactions (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK(type IN ('BUY', 'SELL', 'DIVIDEND', 'FEE')),
  executed_at TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit_price TEXT NOT NULL,
  fee TEXT NOT NULL DEFAULT '0',
  currency TEXT NOT NULL CHECK(length(currency) = 3),
  fx_rate_to_pln TEXT NOT NULL,
  notes TEXT CHECK(length(notes) <= 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX transactions_instrument_date_idx ON investment_transactions(instrument_id, executed_at, id);

CREATE TABLE bond_lots (
  id TEXT PRIMARY KEY,
  series TEXT NOT NULL CHECK(length(series) BETWEEN 1 AND 32),
  bond_type TEXT NOT NULL CHECK(length(bond_type) BETWEEN 1 AND 80),
  purchase_date TEXT NOT NULL,
  maturity_date TEXT NOT NULL,
  quantity TEXT NOT NULL,
  nominal_value_pln TEXT NOT NULL,
  purchase_price_pln TEXT NOT NULL,
  interest_handling TEXT NOT NULL CHECK(interest_handling IN ('CAPITALIZE', 'PAY_OUT')),
  day_count_convention TEXT NOT NULL CHECK(day_count_convention IN ('ACT/365', 'ACT/ACT', '30E/360')),
  notes TEXT CHECK(length(notes) <= 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(maturity_date > purchase_date)
) STRICT;

CREATE INDEX bond_lots_maturity_idx ON bond_lots(maturity_date);

CREATE TABLE bond_rate_periods (
  id TEXT PRIMARY KEY,
  bond_lot_id TEXT NOT NULL REFERENCES bond_lots(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  annual_rate_percent TEXT NOT NULL,
  handling_override TEXT CHECK(handling_override IS NULL OR handling_override IN ('CAPITALIZE', 'PAY_OUT')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(end_date > start_date)
) STRICT;

CREATE INDEX bond_rates_lot_period_idx ON bond_rate_periods(bond_lot_id, start_date, end_date);

CREATE TABLE bond_cashflows (
  id TEXT PRIMARY KEY,
  bond_lot_id TEXT NOT NULL REFERENCES bond_lots(id) ON DELETE CASCADE,
  payment_date TEXT NOT NULL,
  gross_amount_pln TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('INTEREST', 'REDEMPTION', 'EARLY_REDEMPTION')),
  notes TEXT CHECK(length(notes) <= 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX bond_cashflows_lot_date_idx ON bond_cashflows(bond_lot_id, payment_date);

CREATE TABLE quote_cache (
  instrument_id TEXT PRIMARY KEY REFERENCES instruments(id) ON DELETE CASCADE,
  price TEXT NOT NULL,
  previous_close TEXT,
  currency TEXT NOT NULL CHECK(length(currency) = 3),
  provider TEXT NOT NULL,
  quoted_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  market_status TEXT NOT NULL CHECK(market_status IN ('LIVE', 'DELAYED', 'CLOSED', 'STALE', 'MANUAL')),
  data_delay_seconds INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY CHECK(length(key) BETWEEN 1 AND 80),
  value TEXT NOT NULL CHECK(length(value) <= 20000),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
