import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Clock3,
  Gem,
  Landmark,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatPercent, formatPln } from '../domain/money';
import type { DashboardData } from '../types';
import { usePageVisible } from '../hooks/useVisibility';
import { AnimatedValue } from '../components/AnimatedValue';
import { CapitalCore } from '../components/CapitalCore';
import { Card, StatusBadge } from '../components/Ui';

const emptyDashboard: DashboardData = {
  asOf: new Date().toISOString(),
  totalValuePln: '0',
  totalProfitPln: '0',
  returnPercent: '0',
  etfValuePln: '0',
  bondsValuePln: '0',
  accruedInterestPln: '0',
  dailyChangePln: null,
  allocation: { etfPercent: '0', bondsPercent: '0' },
  quotes: [],
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
  const progress = Number(data.game.millionProgressPercent);
  const positive = Number(data.totalProfitPln) >= 0;
  const primaryQuote = data.quotes[0];

  return (
    <div className="page dashboard-page">
      <div className="topline">
        <div>
          <span className="online-dot" />
          PRYWATNY PORTFEL
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
          <span>Nie udało się pobrać danych. Sprawdź lokalne Functions i uwierzytelnienie.</span>
        </div>
      )}
      <section className="hero-grid">
        <div className="hero-copy">
          <div className="rank-pill">
            <Gem size={15} />
            RANGA · {data.game.currentRank.name.toUpperCase()}
          </div>
          <p className="hero-kicker">WARTOŚĆ TWOJEGO KAPITAŁU</p>
          <h1 className="portfolio-value">
            <AnimatedValue value={data.totalValuePln} />
          </h1>
          <div className="result-line">
            <span className={positive ? 'positive' : 'negative'}>
              {positive ? '+' : ''}
              {formatPln(data.totalProfitPln)} <small>{formatPercent(data.returnPercent)}</small>
            </span>
            <span className="estimate">wynik szacunkowy</span>
          </div>
          <div className="million-progress">
            <div className="progress-label">
              <span>Droga do 1 000 000 PLN</span>
              <strong>{formatPercent(progress, 2)}</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
            <p>
              Do kolejnej rangi <strong>{data.game.nextRank?.name ?? 'Cel osiągnięty'}</strong>{' '}
              brakuje {formatPln(data.game.missingToNextRankPln, 0)}
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

      <section className="metric-grid" aria-label="Podsumowanie portfela">
        <Metric
          icon={<WalletCards />}
          label="ETF"
          value={formatPln(data.etfValuePln)}
          sub={`${formatPercent(data.allocation.etfPercent)} portfela`}
        />
        <Metric
          icon={<Landmark />}
          label="Obligacje"
          value={formatPln(data.bondsValuePln)}
          sub={`${formatPercent(data.allocation.bondsPercent)} portfela`}
        />
        <Metric
          icon={<TrendingUp />}
          label="Narosłe odsetki"
          value={formatPln(data.accruedInterestPln)}
          sub="wartość szacunkowa"
        />
        <Metric
          icon={<Activity />}
          label="Zmiana dzienna"
          value={data.dailyChangePln === null ? 'Brak danych' : formatPln(data.dailyChangePln)}
          sub="gdy dostawca podaje poprzednie zamknięcie"
        />
      </section>

      <section className="dashboard-lower">
        <Card className="allocation-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ALOKACJA</p>
              <h2>Spokojna równowaga</h2>
            </div>
            <Link to="/etf">
              Szczegóły <ArrowRight size={15} />
            </Link>
          </div>
          <div className="allocation-visual">
            <div
              className="allocation-donut"
              style={
                {
                  '--allocation': `${Number(data.allocation.etfPercent) * 3.6}deg`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>{formatPercent(data.allocation.etfPercent, 0)}</strong>
                <span>ETF</span>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="emerald" />
                ETF <strong>{formatPln(data.etfValuePln)}</strong>
              </span>
              <span>
                <i className="blue" />
                Obligacje <strong>{formatPln(data.bondsValuePln)}</strong>
              </span>
            </div>
          </div>
        </Card>
        <Card className="market-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ŹRÓDŁO WYCENY</p>
              <h2>Status rynku</h2>
            </div>
            {primaryQuote && <StatusBadge status={primaryQuote.marketStatus} />}
          </div>
          {primaryQuote ? (
            <div className="market-detail">
              <div className="market-symbol">
                <span>{primaryQuote.symbol}</span>
                <strong>
                  {primaryQuote.price
                    ? `${primaryQuote.price} ${primaryQuote.currency}`
                    : 'Brak ceny'}
                </strong>
              </div>
              <p>
                {primaryQuote.provider ?? 'Nieznane źródło'} ·{' '}
                {primaryQuote.staleReason ??
                  'Cena nie jest określana jako „na żywo” bez potwierdzenia dostawcy.'}
              </p>
              {primaryQuote.fxMissing && (
                <div className="inline-warning">
                  <TriangleAlert size={15} />
                  Brakuje jawnego kursu FX do PLN.
                </div>
              )}
            </div>
          ) : (
            <div className="mini-empty">
              <Sparkles size={24} />
              <p>Dodaj instrument i cenę, aby uruchomić wycenę ETF.</p>
              <Link to="/etf">Dodaj ETF</Link>
            </div>
          )}
          <div className="updated">
            <Clock3 size={14} />
            Aktualizacja{' '}
            {new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(data.asOf),
            )}
          </div>
        </Card>
      </section>
      <p className="disclaimer">
        Wartości obligacji są szacunkiem. Aplikacja nie jest narzędziem podatkowym ani oficjalnym
        wyciągiem.
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
