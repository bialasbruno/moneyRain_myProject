# Wdrożenie Cloudflare Pages

## 1. Dwie bazy D1

Utwórz osobno produkcję i preview:

```bash
npx wrangler d1 create money-rain-production
npx wrangler d1 create money-rain-preview
```

Skopiuj identyfikatory do konfiguracji odpowiednich środowisk Pages jako binding `DB`. Nie współdziel bazy. Przed wdrożeniem zastosuj migracje:

```bash
npx wrangler d1 migrations apply money-rain-preview --remote
npx wrangler d1 migrations apply money-rain-production --remote
```

Lokalnie:

```bash
npm run db:migrate:local
```

## 2. Projekt Pages

Połącz repozytorium z Cloudflare Pages:

- build command: `npm run build`
- output directory: `dist`
- root directory: repozytorium
- Functions zostaną wykryte z `functions/`
- binding D1: `DB`

Ustaw aktualny `database_id` zamiast wartości `REPLACE_*` w konfiguracji używanej przez dane środowisko. Podłącz własną subdomenę po pierwszym udanym wdrożeniu.

## 3. Zmienne i sekrety

Dla produkcji ustaw:

- `ENVIRONMENT=production`
- `OWNER_EMAIL` — dokładnie jeden adres właściciela
- `CF_ACCESS_TEAM_DOMAIN` — np. `team.cloudflareaccess.com`
- `CF_ACCESS_AUD` — Application Audience z Access
- sekret `MARKET_DATA_API_KEY`

Dla preview ustaw `ENVIRONMENT=preview`, osobny audience/politykę i osobny klucz, jeżeli dostawca na to pozwala. Nie ustawiaj `DEV_AUTH_BYPASS` albo ustaw `false`. Sekret można dodać przez panel Pages lub właściwy dla Pages mechanizm sekretów CLI. Żadnej z wartości nie prefiksuj `VITE_`.

## 4. Cloudflare Access

1. Zero Trust → Access → Applications → Add an application → Self-hosted.
2. Dodaj domenę produkcyjną oraz osobną aplikację/politykę dla preview.
3. Polityka `Allow` ma zawierać dokładnie jeden `Emails = OWNER_EMAIL`.
4. Nie dodawaj publicznego `Bypass` ani `Everyone`.
5. Skopiuj AUD do `CF_ACCESS_AUD`.
6. Zweryfikuj ochronę strony głównej oraz `/api/health` i `/api/dashboard` w oknie bez sesji.
7. Zweryfikuj, że inny e-mail dostaje 403 również wtedy, gdy ma ważny token z tego samego zespołu.

Access powinien obejmować całą domenę, nie tylko `/api/*`. Middleware API jest drugą warstwą, nie zamiennikiem konfiguracji brzegu.

## 5. Test odbiorczy

Po wdrożeniu:

```bash
curl -i https://portfolio.example.com/api/health
```

Bez sesji odpowiedź ma być blokadą Access albo 403. Po zalogowaniu sprawdź dodanie ręcznego instrumentu, transakcji, partii obligacji i okresu stopy. Następnie pobierz eksport w Ustawieniach i przechowuj poza Cloudflare.

Sprawdź w `dist/assets`, że nie występuje wartość `MARKET_DATA_API_KEY`. Repozytorium zawiera tylko nazwę zmiennej, nie sekret.
