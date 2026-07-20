import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Sparkles, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../lib/api';

interface ProgressionEvent {
  id: string;
  type: 'RANK_UNLOCK' | 'ACHIEVEMENT_UNLOCK' | 'CONTRIBUTION' | string;
  payload: string;
}

interface GameEvents {
  state: { effects_level: 'FULL' | 'LIMITED' | 'OFF' };
  pendingEvents: ProgressionEvent[];
}

export function ProgressionCelebration() {
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const game = useQuery({
    queryKey: ['game'],
    queryFn: () => api<GameEvents>('/game'),
    staleTime: 30_000,
  });
  const event = game.data?.pendingEvents[0];
  const dismiss = useMutation({
    mutationFn: (eventId: string) =>
      api('/game/events', { method: 'PATCH', body: JSON.stringify({ eventIds: [eventId] }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['game'] }),
  });
  if (!event) return null;

  const payload = safePayload(event.payload);
  const rankName = String(payload.name ?? 'Nowa ranga');
  const millionaire = String(payload.rankId ?? '') === 'millionaire';
  const title =
    event.type === 'RANK_UNLOCK'
      ? rankName
      : event.type === 'CHEST_EARNED'
        ? 'Nowa skrzynka czeka!'
        : event.type === 'ITEM_UNLOCK'
          ? String(payload.name ?? 'Nowy przedmiot')
          : 'Nowe osiągnięcie';
  const subtitle =
    event.type === 'RANK_UNLOCK'
      ? 'Ranga pozostaje odblokowana, nawet jeśli wycena później spadnie.'
      : event.type === 'CHEST_EARNED'
        ? '+100 XP za wpłatę. Otwórz skrzynkę w garderobie bohatera.'
        : event.type === 'ITEM_UNLOCK'
          ? 'Wartość portfela odblokowała nowy element ekwipunku postaci.'
          : 'Osiągnięcie trafiło do Twojej gabloty.';
  const animated = !reduced && game.data?.state.effects_level !== 'OFF';

  return (
    <div
      className={`celebration ${millionaire ? 'millionaire' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {animated && <div className="celebration-rays" aria-hidden="true" />}
      <motion.div
        className="celebration-card"
        initial={animated ? { opacity: 0, scale: 0.82, y: 25 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      >
        <button
          className="celebration-close"
          type="button"
          aria-label="Pomiń animację"
          onClick={() => dismiss.mutate(event.id)}
        >
          <X />
        </button>
        <div className="celebration-icon">{millionaire ? <Crown /> : <Sparkles />}</div>
        <p className="eyebrow">{millionaire ? 'CEL GŁÓWNY OSIĄGNIĘTY' : 'NOWE ODBLOKOWANIE'}</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <button className="button" type="button" onClick={() => dismiss.mutate(event.id)}>
          Odbierz i kontynuuj
        </button>
      </motion.div>
    </div>
  );
}

function safePayload(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
