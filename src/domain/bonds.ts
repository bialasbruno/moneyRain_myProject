import Decimal from 'decimal.js';
import { D, ZERO } from './money';

export type DayCount = 'ACT/365' | 'ACT/ACT' | '30E/360';
export type InterestHandling = 'CAPITALIZE' | 'PAY_OUT';

export interface BondRatePeriod {
  id: string;
  startDate: string;
  endDate: string;
  annualRatePercent: string;
  handlingOverride?: InterestHandling | null;
}

export interface BondLotInput {
  purchaseDate: string;
  maturityDate: string;
  quantity: string;
  nominalValuePln: string;
  purchasePricePln: string;
  interestHandling: InterestHandling;
  dayCountConvention: DayCount;
  periods: BondRatePeriod[];
}

export interface BondValuation {
  principalPln: string;
  accruedInterestPln: string;
  capitalizedInterestPln: string;
  paidOutInterestPln: string;
  currentValuePln: string;
  profitPln: string;
  missingRate: boolean;
}

export interface LiveBondValuation extends BondValuation {
  accrualPerSecondPln: string;
}

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const daysBetween = (start: string, end: string) =>
  Math.max(0, Math.round((utc(end).getTime() - utc(start).getTime()) / 86_400_000));
const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

export function yearFraction(start: string, end: string, convention: DayCount): Decimal {
  if (end <= start) return ZERO;
  if (convention === 'ACT/365') return D(daysBetween(start, end)).div(365);
  if (convention === '30E/360') {
    const a = utc(start);
    const b = utc(end);
    const d1 = Math.min(a.getUTCDate(), 30);
    const d2 = Math.min(b.getUTCDate(), 30);
    return D(
      (b.getUTCFullYear() - a.getUTCFullYear()) * 360 +
        (b.getUTCMonth() - a.getUTCMonth()) * 30 +
        d2 -
        d1,
    ).div(360);
  }
  let cursor = utc(start);
  const finish = utc(end);
  let fraction = ZERO;
  while (cursor < finish) {
    const boundary = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1));
    const segmentEnd = boundary < finish ? boundary : finish;
    fraction = fraction.add(
      D((segmentEnd.getTime() - cursor.getTime()) / 86_400_000).div(
        leap(cursor.getUTCFullYear()) ? 366 : 365,
      ),
    );
    cursor = segmentEnd;
  }
  return fraction;
}

export function calculateBond(lot: BondLotInput, asOf = iso(new Date())): BondValuation {
  const valuationDate = asOf < lot.maturityDate ? asOf : lot.maturityDate;
  const originalPrincipal = D(lot.quantity).mul(lot.nominalValuePln);
  const purchaseCost = D(lot.quantity).mul(lot.purchasePricePln);
  let base = originalPrincipal;
  let accrued = ZERO;
  let capitalized = ZERO;
  let paidOut = ZERO;

  const periods = [...lot.periods].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
  );
  for (const period of periods) {
    if (period.startDate >= valuationDate || period.endDate <= lot.purchaseDate) continue;
    const start = period.startDate > lot.purchaseDate ? period.startDate : lot.purchaseDate;
    const end = period.endDate < valuationDate ? period.endDate : valuationDate;
    if (end <= start) continue;
    const interest = base
      .mul(D(period.annualRatePercent).div(100))
      .mul(yearFraction(start, end, lot.dayCountConvention));
    const complete = valuationDate >= period.endDate;
    const handling = period.handlingOverride ?? lot.interestHandling;
    if (complete && handling === 'CAPITALIZE') {
      base = base.add(interest);
      capitalized = capitalized.add(interest);
    } else if (complete && handling === 'PAY_OUT') {
      paidOut = paidOut.add(interest);
    } else {
      accrued = accrued.add(interest);
    }
  }

  const coversCurrent = periods.some(
    (period) => period.startDate <= valuationDate && period.endDate > valuationDate,
  );
  const currentValue = base.add(accrued);
  return {
    principalPln: originalPrincipal.toString(),
    accruedInterestPln: accrued.toString(),
    capitalizedInterestPln: capitalized.toString(),
    paidOutInterestPln: paidOut.toString(),
    currentValuePln: currentValue.toString(),
    profitPln: currentValue.add(paidOut).sub(purchaseCost).toString(),
    missingRate: valuationDate < lot.maturityDate && !coversCurrent,
  };
}

/**
 * Extends the day-count valuation with a deterministic, per-second accrual.
 * The daily economic change includes both value still held in the bond and
 * interest paid out at a period boundary, so capitalization and payouts do
 * not introduce artificial jumps in profit.
 */
export function calculateBondLive(lot: BondLotInput, at = new Date()): LiveBondValuation {
  const day = iso(at);
  const tomorrowDate = utc(day);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);

  const valuation = calculateBond(lot, day);
  const tomorrow = calculateBond(lot, iso(tomorrowDate));
  const economicValue = D(valuation.currentValuePln).add(valuation.paidOutInterestPln);
  const tomorrowEconomicValue = D(tomorrow.currentValuePln).add(tomorrow.paidOutInterestPln);
  const accrualPerSecond = Decimal.max(tomorrowEconomicValue.sub(economicValue), ZERO).div(86_400);
  const startOfDay = utc(day).getTime();
  const elapsedSeconds = Math.max(0, Math.min(86_400, (at.getTime() - startOfDay) / 1_000));
  const accruedSinceMidnight = accrualPerSecond.mul(elapsedSeconds);

  return {
    ...valuation,
    accruedInterestPln: D(valuation.accruedInterestPln).add(accruedSinceMidnight).toString(),
    currentValuePln: D(valuation.currentValuePln).add(accruedSinceMidnight).toString(),
    profitPln: D(valuation.profitPln).add(accruedSinceMidnight).toString(),
    accrualPerSecondPln: accrualPerSecond.toString(),
  };
}
