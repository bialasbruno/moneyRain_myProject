# Architektura

## Przepływ danych

Przeglądarka komunikuje się tylko z `/api/*` same-origin. Middleware weryfikuje Cloudflare Access JWT i adres właściciela, a router waliduje Zod-em ciało żądania. Wyłącznie Pages Functions mają binding D1. Odpowiedź prywatna otrzymuje `Cache-Control: no-store, private`.

Warstwy:

1. `src/domain` — czyste obliczenia Decimal: obligacje, naliczanie sekundowe, level/rangi.
2. `functions/lib` — autoryzacja, walidacja i odpowiedzi HTTP.
3. `functions/api/[[path]].ts` — repozytorium D1 oraz endpointy.
4. `src/pages` — formularze React Hook Form + Zod i dane TanStack Query.
5. `src/components` — prezentacja oraz lazy-loaded React Three Fiber.

## Wycena obligacji na żywo

Dashboard agreguje wyłącznie partie obligacji. Każda wycena zwraca `accrualPerSecondPln`, wyznaczone z dokładnej zmiany ekonomicznej między kolejnymi dniami. Dzięki temu granice kapitalizacji i wypłaty odsetek nie tworzą sztucznych skoków wyniku.

Frontend pobiera nowy punkt bazowy co 60 s i pomiędzy pobraniami aktualizuje licznik lokalnie co sekundę. Ukrycie karty zatrzymuje cykliczne pobieranie API, a po powrocie czas jest przeliczany względem serwerowego `asOf`.

## Import

JSON import jest dwuetapowy: walidacja + podgląd, następnie osobne potwierdzenie. Import dodaje rekordy i nie wykonuje `REPLACE`. Historyczne tabele innych klas aktywów pozostają w schemacie dla zgodności eksportów, ale nie są uwzględniane przez dashboard ani dostępne w interfejsie.

## Gamifikacja

Wartość bieżąca wyznacza aktualny level i postęp. `highest_level`, odblokowania oraz szczyt wartości są trwałe. `progression_events.event_key` jest unikalny, więc ponowne przeliczenie nie przyznaje nagrody drugi raz. XP może pochodzić z zewnętrznych wpłat i celów, nigdy z liczby BUY/SELL. Przedmioty są wyłącznie kosmetyczne.
