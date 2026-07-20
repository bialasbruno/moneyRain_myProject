import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Gift, LockKeyhole, PackageOpen, Shirt, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import {
  CharacterAvatar,
  ItemGlyph,
  type EquippedCharacterItem,
} from '../components/CharacterAvatar';
import { Card, EmptyState, PageHeader, useToast } from '../components/Ui';
import { formatPln } from '../domain/money';
import { api, postJson } from '../lib/api';

type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
type ItemSlot = 'HEAD' | 'EYES' | 'BODY' | 'HAND' | 'BACK' | 'FEET' | 'COMPANION';
type ChestTier = 'WOODEN' | 'SILVER' | 'GOLD';

interface CharacterItem extends EquippedCharacterItem {
  description: string;
  unlock_type: 'STARTER' | 'VALUE' | 'CHEST';
  unlock_value_pln: string | null;
  unlocked_at: string | null;
  unlock_source: string | null;
  equipped_slot: string | null;
}

interface LootChest {
  id: string;
  tier: ChestTier;
  status: 'READY' | 'OPENED';
  created_at: string;
  opened_at: string | null;
  awarded_item_id: string | null;
  awarded_item_name: string | null;
  awarded_item_rarity: string | null;
}

interface GameData {
  characterItems: CharacterItem[];
  chests: LootChest[];
}

interface ChestReward {
  chestId: string;
  item: CharacterItem | null;
  bonusXp: number;
}

const slotNames: Record<ItemSlot, string> = {
  HEAD: 'Głowa',
  EYES: 'Okulary',
  BODY: 'Strój',
  HAND: 'Broń',
  BACK: 'Plecy',
  FEET: 'Buty',
  COMPANION: 'Towarzysz',
};

const tierNames: Record<ChestTier, string> = {
  WOODEN: 'Drewniana skrzynka',
  SILVER: 'Srebrna skrzynka',
  GOLD: 'Złota skrzynka',
};

export function VaultPage() {
  const [slot, setSlot] = useState<'ALL' | ItemSlot>('ALL');
  const [rarity, setRarity] = useState<'ALL' | ItemRarity>('ALL');
  const [reward, setReward] = useState<ChestReward | null>(null);
  const notify = useToast();
  const qc = useQueryClient();
  const game = useQuery({ queryKey: ['game'], queryFn: () => api<GameData>('/game') });
  const equip = useMutation({
    mutationFn: (itemId: string) => postJson('/game/equip', { itemId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game'] });
      notify('Postać ma nowy element ekwipunku.');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });
  const openChest = useMutation({
    mutationFn: (chestId: string) => postJson<ChestReward>(`/game/chests/${chestId}`, {}),
    onSuccess: (result) => {
      setReward(result);
      void qc.invalidateQueries({ queryKey: ['game'] });
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });

  const allItems = game.data?.characterItems ?? [];
  const equipped = allItems.filter((item) => item.equipped_slot) as CharacterItem[];
  const readyChests = game.data?.chests.filter((chest) => chest.status === 'READY') ?? [];
  const items = allItems.filter(
    (item) =>
      (slot === 'ALL' || item.slot === slot) && (rarity === 'ALL' || item.rarity === rarity),
  );

  return (
    <div className="page character-page">
      <PageHeader
        eyebrow="BOHATER DROGI DO MILIONA"
        title="Garderoba i ekwipunek"
        text="Ubieraj własną postać w przedmioty zdobywane za progi kapitału i losowane ze skrzynek za regularne wpłaty."
      />

      <section className="character-hero-grid">
        <Card className="character-card">
          <CharacterAvatar items={equipped} />
        </Card>
        <Card className="equipment-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ZAŁOŻONE</p>
              <h2>Ekwipunek postaci</h2>
            </div>
            <Shirt />
          </div>
          <div className="equipment-slots">
            {(Object.keys(slotNames) as ItemSlot[]).map((itemSlot) => {
              const item = equipped.find((candidate) => candidate.slot === itemSlot);
              return (
                <div className={item ? 'filled' : ''} key={itemSlot}>
                  <span>{item ? <ItemGlyph visualKey={item.visual_key} size={18} /> : '+'}</span>
                  <div>
                    <small>{slotNames[itemSlot]}</small>
                    <strong>{item?.name ?? 'Pusty slot'}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="chest-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SKRZYNKI ZA WPŁATY</p>
            <h2>
              {readyChests.length ? `${readyChests.length} czeka na otwarcie` : 'Brak skrzynek'}
            </h2>
          </div>
          <span className="chest-rule">Wpłata 1 000 PLN → srebrna · 5 000 PLN → złota</span>
        </div>
        {readyChests.length ? (
          <div className="chest-grid">
            {readyChests.map((chest) => (
              <Card className={`loot-chest tier-${chest.tier.toLowerCase()}`} key={chest.id}>
                <div className="chest-visual">
                  <span className="chest-lid" />
                  <span className="chest-body">
                    <Gift />
                  </span>
                  <i />
                </div>
                <div>
                  <p className="eyebrow">{chest.tier}</p>
                  <h3>{tierNames[chest.tier]}</h3>
                  <small>Zdobyta {new Date(chest.created_at).toLocaleDateString('pl-PL')}</small>
                </div>
                <button
                  className="button"
                  onClick={() => openChest.mutate(chest.id)}
                  disabled={openChest.isPending}
                >
                  <PackageOpen size={17} />
                  Otwórz
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="chest-empty">
            <Gift />
            <p>Zapisz wpłatę w zakładce Cele, a pojawi się tutaj skrzynka do otwarcia.</p>
          </Card>
        )}
      </section>

      <div className="collection-toolbar">
        <div>
          <p className="eyebrow">KOLEKCJA</p>
          <h2>Przedmioty bohatera</h2>
        </div>
        <div className="filters">
          <select
            aria-label="Slot ekwipunku"
            value={slot}
            onChange={(e) => setSlot(e.target.value as typeof slot)}
          >
            <option value="ALL">Wszystkie sloty</option>
            {(Object.keys(slotNames) as ItemSlot[]).map((itemSlot) => (
              <option key={itemSlot} value={itemSlot}>
                {slotNames[itemSlot]}
              </option>
            ))}
          </select>
          <select
            aria-label="Rzadkość"
            value={rarity}
            onChange={(e) => setRarity(e.target.value as typeof rarity)}
          >
            <option value="ALL">Każda rzadkość</option>
            <option value="COMMON">Common</option>
            <option value="RARE">Rare</option>
            <option value="EPIC">Epic</option>
            <option value="LEGENDARY">Legendary</option>
          </select>
        </div>
      </div>

      {!items.length && !game.isLoading ? (
        <Card>
          <EmptyState icon={<Sparkles />} title="Brak przedmiotów" text="Zmień wybrane filtry." />
        </Card>
      ) : (
        <div className="character-item-grid">
          {items.map((item) => (
            <Card
              className={`character-item-card rarity-${item.rarity.toLowerCase()} ${!item.unlocked_at ? 'locked' : ''}`}
              key={item.id}
            >
              <div className="character-item-preview">
                <ItemGlyph visualKey={item.visual_key} size={34} />
                {!item.unlocked_at && (
                  <span className="item-lock">
                    <LockKeyhole size={18} />
                  </span>
                )}
                <span className="rarity">{item.rarity}</span>
              </div>
              <p className="eyebrow">{slotNames[item.slot as ItemSlot]}</p>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <small>{unlockLabel(item)}</small>
              {item.unlocked_at && (
                <button
                  className={`button full ${item.equipped_slot ? 'secondary' : ''}`}
                  disabled={Boolean(item.equipped_slot) || equip.isPending}
                  onClick={() => equip.mutate(item.id)}
                >
                  {item.equipped_slot ? (
                    <>
                      <Check size={16} /> Założony
                    </>
                  ) : (
                    'Załóż na postać'
                  )}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {reward && (
        <div
          className="loot-reveal"
          role="dialog"
          aria-modal="true"
          aria-label="Nagroda ze skrzynki"
        >
          <Card
            className={`loot-reveal-card rarity-${reward.item?.rarity.toLowerCase() ?? 'common'}`}
          >
            <button
              className="loot-reveal-close"
              onClick={() => setReward(null)}
              aria-label="Zamknij nagrodę"
            >
              <X />
            </button>
            <p className="eyebrow">SKRZYNKA OTWARTA</p>
            {reward.item ? (
              <>
                <div className="reward-burst">
                  <ItemGlyph visualKey={reward.item.visual_key} size={68} />
                </div>
                <span className="reward-rarity">{reward.item.rarity}</span>
                <h2>{reward.item.name}</h2>
                <p>{reward.item.description}</p>
                <button className="button" onClick={() => equip.mutate(reward.item!.id)}>
                  Załóż teraz
                </button>
              </>
            ) : (
              <>
                <div className="reward-burst">
                  <Sparkles size={68} />
                </div>
                <h2>+{reward.bonusXp} XP</h2>
                <p>Masz już wszystkie przedmioty skrzynkowe, więc otrzymujesz premię XP.</p>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function unlockLabel(item: CharacterItem) {
  if (item.unlocked_at) return `Zdobyto ${new Date(item.unlocked_at).toLocaleDateString('pl-PL')}`;
  if (item.unlock_type === 'VALUE')
    return `Odblokuje się przy ${formatPln(item.unlock_value_pln ?? 0, 0)}`;
  return 'Może wypaść ze skrzynki za wpłatę';
}
