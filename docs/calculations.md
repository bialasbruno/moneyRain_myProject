# Obliczenia finansowe

Wszystkie kwoty, kursy, ceny, ilości i stopy są przechowywane jako tekst dziesiętny i obliczane przez `decimal.js` z precyzją 40 cyfr. SQLite nie wykonuje działań pieniężnych na `REAL`.

## ETF — FIFO

Transakcje są sortowane po `executed_at`, a przy remisie po `id`. Zakup tworzy partię:

`koszt partii PLN = ilość × cena × kurs FX + opłata × kurs FX`

Opłata zakupu zwiększa koszt jednostki. Sprzedaż zużywa najstarsze partie; jej opłata pomniejsza wpływy:

`wynik zrealizowany = wpływ netto sprzedaży − koszt FIFO sprzedanych jednostek`

`wartość rynkowa = pozostała ilość × bieżąca cena × jawny kurs FX`

`wynik niezrealizowany = wartość rynkowa − koszt pozostałych partii`

`wynik całkowity = zrealizowany + niezrealizowany + dywidendy netto`

Stopa zwrotu dzieli wynik całkowity przez łączny koszt zakupów i ich opłat. Jest to prosta stopa dla całej historii, nie TWR ani XIRR.

Przykład: zakup 10 jednostek po 100 EUR przy FX 4,00 i opłacie 5 EUR kosztuje 4 020 PLN. Sprzedaż 4 jednostek po 120 EUR, FX 4,10 i opłata 2 EUR daje 1 959,80 PLN wpływu netto. Koszt FIFO sprzedanej części to 1 608 PLN, więc wynik zrealizowany wynosi 351,80 PLN.

## Obligacje

Dla okresu oprocentowania:

`odsetki = baza × (stopa roczna / 100) × ułamek roku`

- `ACT/365`: rzeczywista liczba dni / 365.
- `ACT/ACT`: dni segmentu w danym roku / 365 lub 366; okres przechodzący przez Nowy Rok jest dzielony.
- `30E/360`: europejska konwencja 30/360.

Przy `CAPITALIZE` odsetki zakończonego okresu zwiększają bazę następnego okresu. Przy `PAY_OUT` są wynikiem wypłaconym, ale nie zwiększają wartości bieżącej. Niepełny okres nalicza odsetki tylko do daty wyceny. Po dacie wykupu naliczanie kończy się.

Jeżeli żadna podana stopa nie pokrywa bieżącej daty, `missingRate=true`. Silnik nie prognozuje inflacji ani stopy NBP i nie dopisuje wymyślonych odsetek.

## Progresja

100 poziomów używa krzywej kwadratowej:

`próg(level) = 1 000 000 × (level / 100)²`

Level 1 to 100 PLN, level 10 to 10 000 PLN, level 50 to 250 000 PLN, a level 100 dokładnie 1 000 000 PLN. Aktualny level może spaść z wartością portfela; historycznie najwyższy pozostaje zapisany.

## Ograniczenia

Wyniki obligacji są szacunkiem. Oficjalne tabele emisji mogą używać odmiennych dat granicznych lub zaokrągleń. Podatek, prowizje niewpisane przez użytkownika i przepływy spoza modelu nie są domyślane.
