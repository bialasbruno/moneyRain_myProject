# Money Rain — Droga do Miliona

Prywatna aplikacja React + Cloudflare Pages Functions do ręcznego prowadzenia polskich detalicznych obligacji skarbowych. Dashboard pokazuje narastanie odsetek co sekundę i łączy je z gamifikacją celu 1 000 000 PLN. Wpłaty przyznają skrzynki z losowymi elementami ubioru, a kolejne progi wartości odblokowują wyposażenie postaci. Aplikacja nie łączy się z brokerem i nie prognozuje przyszłego oprocentowania.

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
- Wspólna domena finansowa w `src/domain/` używa `decimal.js`; dzienny przyrost obligacji jest interpolowany do dokładnego tempa na sekundę.
- Trzy wersjonowane migracje w `migrations/`; trzecia dodaje postać, ekwipunek i skrzynki.
- Scena 3D jest lazy-loaded; bez WebGL lub przy wyłączonych efektach działa fallback CSS/SVG.

Więcej: [architektura](docs/architecture.md), [obliczenia](docs/calculations.md), [bezpieczeństwo](docs/security.md), [wdrożenie](docs/cloudflare-deployment.md).

## Ważne zastrzeżenie

Aplikacja nie jest narzędziem podatkowym, rekomendacją inwestycyjną ani oficjalnym wyciągiem. Wyceny obligacji są szacunkami; tabele emisyjne mogą stosować własne reguły zaokrągleń.
