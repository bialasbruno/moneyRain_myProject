# Bezpieczeństwo i prywatność

## Granice

- Cloudflare Access chroni całą domenę; `robots.txt` nie jest zabezpieczeniem.
- Middleware ponownie weryfikuje `Cf-Access-Jwt-Assertion` przez JWKS, audience, issuer i `OWNER_EMAIL`.
- Produkcja bez kompletnej konfiguracji kończy się 403 (fail closed).
- Bypass wymaga jednocześnie `ENVIRONMENT=development` i `DEV_AUTH_BYPASS=true`.
- Operacje modyfikujące wymagają dokładnego `Origin` zgodnego z originem URL.
- D1 używa prepared statements, a pola przechodzą limity Zod i limity bazy.

## Sekrety

`MARKET_DATA_API_KEY`, `OWNER_EMAIL`, `CF_ACCESS_TEAM_DOMAIN` i `CF_ACCESS_AUD` są zmiennymi/sekretami Pages Functions. Nigdy nie nadaj im prefiksu `VITE_`. Nie wprowadzaj prawdziwych wartości do `.env.example`, `.dev.vars.example`, kodu, logów ani seedów.

Kod nie loguje tokenów, e-maila, transakcji ani wartości portfela. Ogólne błędy API zwracają kod, polski komunikat i request id bez danych wewnętrznych.

## Nagłówki

Statyczne `_headers` ustawia CSP, `nosniff`, `no-referrer`, restrykcyjne `Permissions-Policy` oraz ochronę przed ramkami. API dodatkowo ustawia `Cache-Control: no-store, private`.

CSP dopuszcza `connect-src 'self'`; Twelve Data jest wywoływane z backendu, nie z przeglądarki.

## Preview

Preview musi mieć osobną D1, inne sekrety i własną politykę Access. Nigdy nie podłączaj produkcyjnego `database_id` do gałęzi preview. Do preview używaj wyłącznie fikcyjnych danych.

## Model zagrożeń

Najważniejsze ryzyka: błędna polityka Access, wyciek sekretu do bundla, CSRF, wstrzyknięcia SQL, zbyt świeże deklarowanie opóźnionej ceny i utrata danych. Odpowiedzi: podwójna weryfikacja Access, brak `VITE_*` dla sekretów, kontrola Origin, prepared statements, statusy rynku/cache stale oraz eksport JSON.
