import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Gem, LockKeyhole, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Card, EmptyState, PageHeader, useToast } from '../components/Ui';
import { api, postJson } from '../lib/api';

interface Cosmetic {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  unlock_condition: string;
  unlocked_at: string | null;
  equipped_category: string | null;
  thumbnail_key: string;
}
interface GameData {
  cosmetics: Cosmetic[];
}

export function VaultPage() {
  const [category, setCategory] = useState('ALL');
  const [rarity, setRarity] = useState('ALL');
  const notify = useToast();
  const qc = useQueryClient();
  const game = useQuery({ queryKey: ['game'], queryFn: () => api<GameData>('/game') });
  const equip = useMutation({
    mutationFn: (itemId: string) => postJson('/game/equip', { itemId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game'] });
      notify('Wygląd Rdzenia został zmieniony.');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const items =
    game.data?.cosmetics.filter(
      (item) =>
        (category === 'ALL' || item.category === category) &&
        (rarity === 'ALL' || item.rarity === rarity),
    ) ?? [];
  return (
    <div className="page">
      <PageHeader
        eyebrow="KOLEKCJA"
        title="Skarbiec artefaktów"
        text="Kosmetyczne nagrody zmieniają atmosferę skarbca, nigdy wynik finansowy."
      />
      <div className="filters">
        <select
          aria-label="Kategoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="ALL">Wszystkie kategorie</option>
          <option value="AURA">Aury</option>
          <option value="RING">Pierścienie</option>
          <option value="BACKGROUND">Tła</option>
          <option value="TITLE">Tytuły</option>
        </select>
        <select aria-label="Rzadkość" value={rarity} onChange={(e) => setRarity(e.target.value)}>
          <option value="ALL">Każda rzadkość</option>
          <option value="COMMON">Common</option>
          <option value="RARE">Rare</option>
          <option value="EPIC">Epic</option>
          <option value="LEGENDARY">Legendary</option>
        </select>
      </div>
      {!items.length && !game.isLoading ? (
        <Card>
          <EmptyState
            icon={<Gem />}
            title="Brak przedmiotów"
            text="Zmień filtry lub zdobądź kolejne kamienie milowe."
          />
        </Card>
      ) : (
        <div className="vault-grid">
          {items.map((item) => (
            <Card
              className={`item-card rarity-${item.rarity.toLowerCase()} ${!item.unlocked_at ? 'locked' : ''}`}
              key={item.id}
            >
              <div className="item-preview">
                <span className={`procedural ${item.thumbnail_key}`}>
                  <Sparkles />
                </span>
                {!item.unlocked_at && (
                  <div className="lock">
                    <LockKeyhole />
                  </div>
                )}
                <span className="rarity">{item.rarity}</span>
              </div>
              <p className="eyebrow">{item.category}</p>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <small>
                {item.unlocked_at
                  ? `Zdobyto ${new Date(item.unlocked_at).toLocaleDateString('pl-PL')}`
                  : item.unlock_condition}
              </small>
              {item.unlocked_at && (
                <button
                  className={`button full ${item.equipped_category ? 'secondary' : ''}`}
                  disabled={Boolean(item.equipped_category) || equip.isPending}
                  onClick={() => equip.mutate(item.id)}
                >
                  {item.equipped_category ? (
                    <>
                      <Check size={16} />
                      Założony
                    </>
                  ) : (
                    'Wyposaż'
                  )}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
