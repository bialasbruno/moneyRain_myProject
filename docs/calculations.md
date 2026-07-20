# Obliczenia finansowe

Wszystkie kwoty, kursy, ceny, ilości i stopy są przechowywane jako tekst dziesiętny i obliczane przez `decimal.js` z precyzją 40 cyfr. SQLite nie wykonuje działań pieniężnych na `REAL`.

## Obligacje

Dla okresu oprocentowania:

`odsetki = baza × (stopa roczna / 100) × ułamek roku`

- `ACT/365`: rzeczywista liczba dni / 365.
- `ACT/ACT`: dni segmentu w danym roku / 365 lub 366; okres przechodzący przez Nowy Rok jest dzielony.
- `30E/360`: europejska konwencja 30/360.

Przy `CAPITALIZE` odsetki zakończonego okresu zwiększają bazę następnego okresu. Przy `PAY_OUT` są wynikiem wypłaconym, ale nie zwiększają wartości bieżącej. Niepełny okres nalicza odsetki tylko do daty wyceny. Po dacie wykupu naliczanie kończy się.

Jeżeli żadna podana stopa nie pokrywa bieżącej daty, `missingRate=true`. Silnik nie prognozuje inflacji ani stopy NBP i nie dopisuje wymyślonych odsetek.

### Licznik na żywo

Serwer liczy ekonomiczną wartość obligacji na początku bieżącego i następnego dnia. Różnica obejmuje zarówno wartość pozostającą w obligacji, jak i odsetki wypłacane na granicy okresu:

`tempo na sekundę = max(wartość ekonomiczna jutro − wartość ekonomiczna dziś, 0) / 86 400`

Do dziennej wyceny dodawana jest część odpowiadająca sekundom, które upłynęły od północy UTC. API zwraca punkt bazowy `asOf` oraz `accrualPerSecondPln`; przeglądarka aktualizuje widok co sekundę między pełnymi odświeżeniami danych. Jeżeli brakuje stopy albo obligacja jest po wykupie, tempo wynosi zero.

## Progresja

100 poziomów używa krzywej kwadratowej:

`próg(level) = 1 000 000 × (level / 100)²`

Level 1 to 100 PLN, level 10 to 10 000 PLN, level 50 to 250 000 PLN, a level 100 dokładnie 1 000 000 PLN. Aktualny level może spaść z wartością portfela; historycznie najwyższy pozostaje zapisany.

## Ograniczenia

Wyniki obligacji są szacunkiem. Oficjalne tabele emisji mogą używać odmiennych dat granicznych lub zaokrągleń. Podatek, prowizje niewpisane przez użytkownika i przepływy spoza modelu nie są domyślane.
