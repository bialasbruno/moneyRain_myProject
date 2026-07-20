# Money Rain — Droga do Miliona

Prywatna aplikacja React + Cloudflare Pages Functions do ręcznego prowadzenia ETF-ów i polskich detalicznych obligacji skarbowych. Dashboard łączy spokojną analizę finansową z uczciwą gamifikacją celu 1 000 000 PLN. Nie łączy się z XTB, nie scrapuje xStation i nie przechowuje danych brokera.

## Lokalnie

Wymagania: Node.js 22+, npm i konto Cloudflare tylko do operacji zdalnych.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run build
npx wrangler pages dev dist --d1 DB=money-rain-dev
```

W `.dev.vars` pozostaw `ENVIRONMENT=development` i `DEV_AUTH_BYPASS=true` wyłącznie lokalnie. Plik jest ignorowany przez Git. Sam frontend, bez Functions, można uruchomić komendą `npm run dev`; formularze wymagają jednak pełnego środowiska Pages powyżej.

Ręczne wdrożenie istniejącego projektu Pages:

```bash
npm run build
npm run deploy
```

Nie używaj `wrangler deploy` — jest to komenda projektu Workers. Dla Pages właściwą komendą jest `wrangler pages deploy`.

Opcjonalne, wyłącznie fikcyjne dane:

```bash
npm run db:seed:local
```

## Kontrola jakości

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Architektura

- SPA w `src/`, wynik w `dist/`.
- Prywatne API w `functions/api/[[path]].ts`; D1 jest dostępne tylko przez binding `DB`.
- Wspólna domena finansowa w `src/domain/` używa `decimal.js`.
- Dwie wersjonowane migracje w `migrations/`.
- Dostawcy cen: ręczny i Twelve Data, wyłącznie po stronie serwera.
- Scena 3D jest lazy-loaded; bez WebGL lub przy wyłączonych efektach działa fallback CSS/SVG.

Więcej: [architektura](docs/architecture.md), [obliczenia](docs/calculations.md), [bezpieczeństwo](docs/security.md), [wdrożenie](docs/cloudflare-deployment.md).

## Ważne zastrzeżenie

Aplikacja nie jest narzędziem podatkowym, rekomendacją inwestycyjną ani oficjalnym wyciągiem. Wyceny obligacji są szacunkami; tabele emisyjne mogą stosować własne reguły zaokrągleń.
