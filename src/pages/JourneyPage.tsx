import { useQuery } from '@tanstack/react-query';
import { Check, Crown, LockKeyhole, Map, Sparkles } from 'lucide-react';
import { Card, PageHeader } from '../components/Ui';
import { api } from '../lib/api';
import type { DashboardData } from '../types';
import { DEFAULT_RANKS } from '../domain/progression';
import { formatPln } from '../domain/money';

export function JourneyPage() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/dashboard'),
  });
  const value = Number(data?.totalValuePln ?? 0);
  return (
    <div className="page">
      <PageHeader
        eyebrow="MAPA POSTĘPU"
        title="Droga do miliona"
        text="Bieżąca wartość może rosnąć i spadać. Raz zdobyte kamienie milowe pozostają w gablocie."
      />
      <Card className="journey-summary">
        <div>
          <Map size={22} />
          <span>Aktualna pozycja</span>
          <strong>{formatPln(value)}</strong>
        </div>
        <div>
          <Sparkles size={22} />
          <span>Poziom</span>
          <strong>{data?.game.currentLevel ?? 0} / 100</strong>
        </div>
        <div>
          <Crown size={22} />
          <span>Najwyższy poziom</span>
          <strong>{data?.game.highestLevel ?? 0}</strong>
        </div>
      </Card>
      <div className="journey-map">
        {DEFAULT_RANKS.map((rank, index) => {
          const reached = value >= Number(rank.thresholdPln);
          const active = rank.id === data?.game.currentRank.id;
          return (
            <div
              className={`milestone ${reached ? 'reached' : ''} ${active ? 'active' : ''}`}
              key={rank.id}
            >
              <div className="milestone-rail">
                <span>{reached ? <Check size={17} /> : <LockKeyhole size={15} />}</span>
                {index < DEFAULT_RANKS.length - 1 && <i />}
              </div>
              <Card>
                <div>
                  <p className="eyebrow">KAMIEŃ {String(index + 1).padStart(2, '0')}</p>
                  <h2>{rank.name}</h2>
                  <p>{rank.description}</p>
                </div>
                <strong>{formatPln(rank.thresholdPln, 0)}</strong>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
