import { useEffect, useState } from 'react';
import { D } from '../domain/money';

export function useLiveClock() {
  const [timestamp, setTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setTimestamp(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return timestamp;
}

export function liveAccruedValue(
  baseValuePln: string | number,
  accrualPerSecondPln: string | number,
  asOf: string,
  timestamp: number,
) {
  const baseTimestamp = Date.parse(asOf);
  const elapsedSeconds = Number.isFinite(baseTimestamp)
    ? Math.max(0, (timestamp - baseTimestamp) / 1_000)
    : 0;
  return D(baseValuePln).add(D(accrualPerSecondPln).mul(elapsedSeconds)).toString();
}
