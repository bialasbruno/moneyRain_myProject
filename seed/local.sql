-- Wyłącznie opcjonalne, fikcyjne dane lokalne. Nigdy nie uruchamiaj na produkcji.
INSERT OR IGNORE INTO instruments (
  id, name, symbol, provider_symbol, exchange, mic, isin, quote_currency,
  base_currency, quote_provider, manual_price, manual_price_updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000001', 'Przykładowy ETF ACWI', 'DEMO',
  'DEMO:XETR', 'Xetra', 'XETR', 'DE0000000000', 'EUR', 'EUR', 'MANUAL', '100.00',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

