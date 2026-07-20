# Architektura

## Przepływ danych

Przeglądarka komunikuje się tylko z `/api/*` same-origin. Middleware weryfikuje Cloudflare Access JWT i adres właściciela, a router waliduje Zod-em ciało żądania. Wyłącznie Pages Functions mają binding D1. Odpowiedź prywatna otrzymuje `Cache-Control: no-store, private`.

Warstwy:

1. `src/domain` — czyste obliczenia Decimal: FIFO, obligacje, level/rangi.
2. `functions/lib` — autoryzacja, walidacja, odpowiedzi i adaptery notowań.
3. `functions/api/[[path]].ts` — repozytorium D1 oraz endpointy.
4. `src/pages` — formularze React Hook Form + Zod i dane TanStack Query.
5. `src/components` — prezentacja oraz lazy-loaded React Three Fiber.

## Notowania

`QuoteProvider` oddziela aplikację od dostawcy. `ManualQuoteProvider` jest zawsze dostępny. `TwelveDataQuoteProvider` korzysta z serwerowego nagłówka `Authorization`; klucz nie jest zwracany ani logowany. Cache D1 ma TTL około 60 s. Jeżeli świeże pobranie nie powiedzie się, API zwraca ostatnią cenę jako `STALE`, a wartość portfela nie spada przez sam błąd dostawcy.

Polling frontendu działa maksymalnie raz na 60 s, zatrzymuje się w ukrytej karcie i ma wykładniczy backoff. Statusy to `LIVE`, `DELAYED`, `CLOSED`, `STALE`, `MANUAL`; UI nie nazywa ceny „na żywo”, jeżeli dostawca tego nie potwierdza.

## FX

Każda transakcja zapisuje jawny `fx_rate_to_pln`. Bieżąca wycena instrumentu w obcej walucie używa ostatniego zapisanego kursu tego instrumentu. Brak kursu daje jawne ostrzeżenie i zerową wycenę PLN — nie następuje ciche utożsamienie EUR/USD/GBP z PLN. Kolejnym adapterem może być serwerowy `FxProvider` bez zmiany modelu transakcji.

## Import

JSON import jest dwuetapowy: walidacja + podgląd, następnie osobne potwierdzenie. Import dodaje rekordy i nie wykonuje `REPLACE`. Przygotowany model instrumentu (`provider_symbol`, ISIN, MIC, giełda) pozwala później dodać parser CSV jako osobny adapter.

## Gamifikacja

Wartość bieżąca wyznacza aktualny level i postęp. `highest_level`, odblokowania oraz szczyt wartości są trwałe. `progression_events.event_key` jest unikalny, więc ponowne przeliczenie nie przyznaje nagrody drugi raz. XP może pochodzić z zewnętrznych wpłat i celów, nigdy z liczby BUY/SELL. Przedmioty są wyłącznie kosmetyczne.
