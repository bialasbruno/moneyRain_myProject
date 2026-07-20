import { useQuery } from '@tanstack/react-query';
import { Award, BadgeCheck, LockKeyhole } from 'lucide-react';
import { Card, PageHeader } from '../components/Ui';
import { api } from '../lib/api';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
}
interface GameData {
  achievements: Achievement[];
}
export function AchievementsPage() {
  const game = useQuery({ queryKey: ['game'], queryFn: () => api<GameData>('/game') });
  const unlocked = game.data?.achievements.filter((item) => item.unlocked_at).length ?? 0;
  const total = game.data?.achievements.length ?? 0;
  return (
    <div className="page">
      <PageHeader
        eyebrow="GABLOTA"
        title="Osiągnięcia"
        text="Nagradzamy konsekwencję, regularne oszczędzanie i cierpliwość w budowaniu portfela obligacji."
        action={
          <div className="achievement-counter">
            <strong>{unlocked}</strong>
            <span>/ {total} zdobytych</span>
          </div>
        }
      />
      <div className="achievement-grid">
        {game.data?.achievements.map((item) => (
          <Card className={`achievement-card ${item.unlocked_at ? 'unlocked' : ''}`} key={item.id}>
            <div className="achievement-icon">
              {item.unlocked_at ? <BadgeCheck /> : <LockKeyhole />}
            </div>
            <div>
              <p className="eyebrow">{item.unlocked_at ? 'ODBLOKOWANE' : 'DO ZDOBYCIA'}</p>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              {item.unlocked_at && (
                <small>{new Date(item.unlocked_at).toLocaleDateString('pl-PL')}</small>
              )}
            </div>
          </Card>
        )) ?? (
          <Card>
            <Award /> Wczytywanie gabloty…
          </Card>
        )}
      </div>
    </div>
  );
}
