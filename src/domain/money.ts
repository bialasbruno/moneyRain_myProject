import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type DecimalInput = Decimal.Value;

export const D = (value: DecimalInput | null | undefined) => new Decimal(value ?? 0);
export const ZERO = new Decimal(0);

export function decimalText(value: DecimalInput, places?: number): string {
  const decimal = D(value);
  return places === undefined
    ? decimal.toString()
    : decimal.toDecimalPlaces(places).toFixed(places);
}

export function formatPln(value: DecimalInput, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits,
  }).format(D(value).toNumber());
}

export function formatPrecisePln(value: DecimalInput, fractionDigits = 6): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(D(value).toNumber());
}

export function formatPercent(value: DecimalInput, maximumFractionDigits = 2): string {
  return `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits }).format(D(value).toNumber())}%`;
}
