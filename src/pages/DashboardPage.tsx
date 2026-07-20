import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  Coins,
  Gem,
  Gauge,
  Landmark,
  Radio,
  RefreshCw,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CapitalCore } from '../components/CapitalCore';
import { Card } from '../components/Ui';
import { D } from '../domain/money';
import { formatPercent, formatPln, formatPrecisePln } from '../domain/money';
import { liveAccruedValue, useLiveClock } from '../hooks/useLiveAccrual';
import { usePageVisible } from '../hooks/useVisibility';
import { api } from '../lib/api';
import type { DashboardData } from '../types';

const emptyDashboard: DashboardData = {
  asOf: new Date().toISOString(),
  totalValuePln: '0',
  totalProfitPln: '0',
  returnPercent: '0',
  bondsValuePln: '0',
  bondPrincipalPln: '0',
  bondPurchaseCostPln: '0',
  accruedInterestPln: '0',
  accrualPerSecondPln: '0',
  bonds: [],
  game: {
    currentLevel: 0,
    highestLevel: 0,
    nextLevel: 1,
    levelProgressPercent: '0',
    missingToNextLevelPln: '100',
    millionProgressPercent: '0',
    currentRank: {
      id: 'novice',
      name: 'Nowicjusz',
      thresholdPln: '0',
      description: 'Pierwszy krok.',
    },
    nextRank: {
      id: 'spark',
      name: 'Pierwsza Iskra',
      thresholdPln: '1000',
      description: 'Pierwszy tysiąc.',
    },
    missingToNextRankPln: '1000',
    effectsLevel: 'FULL',
    soundEnabled: false,
  },
};

export function DashboardPage() {
  const visible = usePageVisible();
  const timestamp = useLiveClock();
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/dashboard'),
    placeholderData: emptyDashboard,
    refetchInterval: visible ? 60_000 : false,
    refetchIntervalInBackground: false,
    retry: (count) => count < 3,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
  });
  const data = query.data ?? emptyDashboard;
  const liveValue = liveAccruedValue(
    data.totalValuePln,
    data.accrualPerSecondPln,
    data.asOf,
    timestamp,
  );
  const liveProfit = liveAccruedValue(
    data.totalProfitPln,
    data.accrualPerSecondPln,
    data.asOf,
    timestamp,
  );
  const liveInterest = liveAccruedValue(
    data.accruedInterestPln,
    data.accrualPerSecondPln,
    data.asOf,
    timestamp,
  );
  const progress = Math.min(100, D(liveValue).div(1_000_000).mul(100).toNumber());
  const returnPercent = D(data.bondPurchaseCostPln).eq(0)
    ? '0'
    : D(liveProfit).div(data.bondPurchaseCostPln).mul(100).toString();
  const positive = D(liveProfit).gte(0);
  const dailyAccrual = D(data.accrualPerSecondPln).mul(86_400).toString();
  const activeSeries = data.bonds.filter(
    (bond) => !bond.valuation.missingRate && D(bond.valuation.accrualPerSecondPln).gt(0),
  );
  const rankGap = data.game.nextRank ? D(data.game.nextRank.thresholdPln).minus(liveValue) : D(0);
  const missingToRank = rankGap.isNegative() ? '0' : rankGap.toString();

  return (
    <div className="page dashboard-page">
      <div className="topline">
        <div>
          <span className="online-dot" />
          PRYWATNY SKARBIEC OBLIGACJI
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void query.refetch()}
          aria-label="Odśwież dane"
        >
          <RefreshCw size={16} className={query.isFetching ? 'spin' : ''} />
        </button>
      </div>
      {query.isError && (
        <div className="notice error">
          <TriangleAlert size={17} />
          <span>Nie udało się pobrać danych obligacji.</span>
        </div>
      )}

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="rank-pill">
            <Gem size={15} />
            RANGA · {data.game.currentRank.name.toUpperCase()}
          </div>
          <p className="hero-kicker">WARTOŚĆ TWOICH OBLIGACJI</p>
          <h1 className="portfolio-value live-portfolio-value">{formatPln(liveValue)}</h1>
          <div className="live-ticker" aria-label="Licznik odsetek działa na żywo">
            <span className="live-dot" />
            NA ŻYWO
            <strong>+{formatPrecisePln(data.accrualPerSecondPln)}/s</strong>
          </div>
          <div className="result-line">
            <span className={positive ? 'positive' : 'negative'}>
              {positive ? '+' : ''}
              {formatPln(liveProfit)} <small>{formatPercent(returnPercent)}</small>
            </span>
            <span className="estimate">wynik narastający co sekundę</span>
          </div>
          <div className="million-progress">
            <div className="progress-label">
              <span>Droga obligacjami do 1 000 000 PLN</span>
              <strong>{formatPercent(progress, 4)}</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              Do kolejnej rangi <strong>{data.game.nextRank?.name ?? 'Cel osiągnięty'}</strong>{' '}
              brakuje {formatPln(missingToRank, 0)}
            </p>
          </div>
        </div>
        <button
          className="core-button"
          type="button"
          aria-label={`Rdzeń Kapitału, poziom ${data.game.currentLevel}`}
        >
          <CapitalCore progress={progress} effects={data.game.effectsLevel} />
          <div className="core-level">
            <span>LEVEL</span>
            <strong>{data.game.currentLevel}</strong>
            <small>/100</small>
          </div>
        </button>
      </section>

      <section className="metric-grid" aria-label="Podsumowanie obligacji">
        <Metric
          icon={<Landmark />}
          label="Wartość obligacji"
          value={formatPln(liveValue)}
          sub={`${data.bonds.length} ${data.bonds.length === 1 ? 'partia' : 'partii'} w skarbcu`}
        />
        <Metric
          icon={<Coins />}
          label="Narosłe odsetki"
          value={formatPrecisePln(liveInterest)}
          sub="liczone na bieżąco"
        />
        <Metric
          icon={<TrendingUp />}
          label="Przyrost na dobę"
          value={`+${formatPln(dailyAccrual)}`}
          sub="według obecnych okresów"
        />
        <Metric
          icon={<Gauge />}
          label="Tempo naliczania"
          value={`+${formatPrecisePln(data.accrualPerSecondPln)}`}
          sub="każdej sekundy"
        />
      </section>

      <section className="dashboard-lower bond-dashboard-lower">
        <Card className="accrual-engine-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SILNIK ODSETEK</p>
              <h2>Kapitał pracuje</h2>
            </div>
            <div className="engine-status">
              <Radio size={16} /> aktywny
            </div>
          </div>
          <div className="engine-counter">
            <span>Naliczone odsetki</span>
            <strong>{formatPrecisePln(liveInterest)}</strong>
            <small>
              +{formatPrecisePln(data.accrualPerSecondPln)}/s · +{formatPln(dailyAccrual)}/dobę
            </small>
          </div>
          <div className="engine-meta">
            <span>
              <CalendarClock size={16} />
              {new Intl.DateTimeFormat('pl-PL', { timeStyle: 'medium' }).format(timestamp)}
            </span>
            <span>{activeSeries.length} aktywnych okresów oprocentowania</span>
          </div>
        </Card>

        <Card className="bond-series-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">TWOJE SERIE</p>
              <h2>Obligacje w skarbcu</h2>
            </div>
            <Link to="/bonds">
              Zarządzaj <ArrowRight size={15} />
            </Link>
          </div>
          {data.bonds.length ? (
            <div className="dashboard-bond-list">
              {data.bonds.slice(0, 4).map((bond) => (
                <div key={bond.id}>
                  <span>
                    <strong>{bond.series}</strong>
                    <small>wykup {new Date(bond.maturityDate).toLocaleDateString('pl-PL')}</small>
                  </span>
                  <span className={bond.valuation.missingRate ? 'rate-missing' : 'rate-live'}>
                    {bond.valuation.missingRate
                      ? 'Uzupełnij oprocentowanie'
                      : `+${formatPrecisePln(bond.valuation.accrualPerSecondPln)}/s`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bond-empty-cta">
              <Landmark size={28} />
              <p>Dodaj pierwszą partię obligacji i uruchom licznik odsetek.</p>
              <Link className="button" to="/bonds">
                Dodaj obligacje
              </Link>
            </div>
          )}
        </Card>
      </section>
      <p className="disclaimer">
        Licznik jest szacunkiem opartym wyłącznie na wpisanych okresach oprocentowania i wybranej
        konwencji day-count. Nie prognozuje przyszłych stóp.
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{sub}</span>
      </div>
    </Card>
  );
}
