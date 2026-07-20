import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FileJson,
  Gauge,
  LockKeyhole,
  Save,
  ShieldCheck,
  Trophy,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Card, PageHeader, useToast } from '../components/Ui';
import { api, postJson } from '../lib/api';

interface GameSettings {
  state: { effects_level: 'FULL' | 'LIMITED' | 'OFF'; sound_enabled: number };
}
interface RankSetting {
  id: string;
  threshold_pln: string;
  name: string;
  description: string;
  reward_item_id: string | null;
}
export function SettingsPage() {
  const game = useQuery({ queryKey: ['game'], queryFn: () => api<GameSettings>('/game') });
  const ranks = useQuery({ queryKey: ['ranks'], queryFn: () => api<RankSetting[]>('/ranks') });
  const qc = useQueryClient();
  const notify = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    archive: unknown;
    summary: Record<string, number>;
  } | null>(null);
  const save = useMutation({
    mutationFn: (data: unknown) =>
      api('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      notify('Ustawienia zapisane.');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const importData = useMutation({
    mutationFn: ({ archive, confirm }: { archive: unknown; confirm: boolean }) =>
      postJson<{ summary: Record<string, number> }>('/import', { archive, confirm }),
    onSuccess: (result, variables) => {
      if (!variables.confirm) setPreview({ archive: variables.archive, summary: result.summary });
      else {
        setPreview(null);
        notify('Dane zostały zaimportowane.');
        void qc.invalidateQueries();
      }
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const saveRank = useMutation({
    mutationFn: ({ rankId, data }: { rankId: string; data: Record<string, unknown> }) =>
      api(`/ranks/${rankId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ranks'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      notify('Próg rangi został zaktualizowany.');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });
  const effects = game.data?.state.effects_level ?? 'FULL';
  const sound = Boolean(game.data?.state.sound_enabled);
  return (
    <div className="page">
      <PageHeader
        eyebrow="KONTROLA SKARBCA"
        title="Ustawienia"
        text="Prywatność, jakość efektów, kopie zapasowe i bezpieczny import z podglądem."
      />
      <div className="settings-grid">
        <Card>
          <div className="settings-heading">
            <div className="metric-icon">
              <Gauge />
            </div>
            <div>
              <h2>Poziom efektów</h2>
              <p>Dostosuj scenę do urządzenia i swoich preferencji.</p>
            </div>
          </div>
          <div className="segmented">
            {(['FULL', 'LIMITED', 'OFF'] as const).map((level) => (
              <button
                type="button"
                className={effects === level ? 'active' : ''}
                key={level}
                onClick={() => save.mutate({ effectsLevel: level })}
              >
                {level === 'FULL' ? 'Pełne' : level === 'LIMITED' ? 'Ograniczone' : 'Wyłączone'}
              </button>
            ))}
          </div>
          <label className="switch-row">
            <span>
              <strong>Dźwięk</strong>
              <small>Domyślnie wyłączony; żadnego autoplay.</small>
            </span>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => save.mutate({ soundEnabled: e.target.checked })}
            />
          </label>
        </Card>
        <Card>
          <div className="settings-heading">
            <div className="metric-icon">
              <ShieldCheck />
            </div>
            <div>
              <h2>Ochrona danych</h2>
              <p>API działa wyłącznie same-origin i nie zapisuje danych brokera.</p>
            </div>
          </div>
          <ul className="check-list">
            <li>
              <LockKeyhole size={16} />
              Cloudflare Access przed całą stroną
            </li>
            <li>
              <ShieldCheck size={16} />
              Właściciel weryfikowany z JWT
            </li>
            <li>
              <FileJson size={16} />
              Prywatne odpowiedzi no-store
            </li>
          </ul>
        </Card>
        <Card>
          <div className="settings-heading">
            <div className="metric-icon">
              <Download />
            </div>
            <div>
              <h2>Kopia zapasowa</h2>
              <p>Pobierz pełny eksport JSON. Przechowuj go w bezpiecznym miejscu.</p>
            </div>
          </div>
          <a className="button full" href="/api/export" download>
            <Download size={16} />
            Pobierz kopię JSON
          </a>
        </Card>
        <Card>
          <div className="settings-heading">
            <div className="metric-icon">
              <Upload />
            </div>
            <div>
              <h2>Import danych</h2>
              <p>Najpierw walidujemy i pokazujemy zakres. Bez automatycznego nadpisywania.</p>
            </div>
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file
                .text()
                .then((text) =>
                  importData.mutate({ archive: JSON.parse(text) as unknown, confirm: false }),
                )
                .catch(() => notify('Plik nie jest poprawnym JSON-em.', 'error'));
            }}
          />
          <button className="button secondary full" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            Wybierz plik
          </button>
          {preview && (
            <div className="import-preview">
              <strong>Podgląd importu</strong>
              {Object.entries(preview.summary).map(([key, value]) => (
                <span key={key}>
                  {key}: {value}
                </span>
              ))}
              <button
                className="button"
                onClick={() => importData.mutate({ archive: preview.archive, confirm: true })}
              >
                <Save size={16} />
                Potwierdź import
              </button>
            </div>
          )}
        </Card>
      </div>
      <Card className="rank-settings">
        <div className="settings-heading">
          <div className="metric-icon">
            <Trophy />
          </div>
          <div>
            <h2>Konfiguracja rang</h2>
            <p>Edytuj progi, nazwy, opisy i opcjonalne identyfikatory nagród.</p>
          </div>
        </div>
        <div className="rank-editor-list">
          {ranks.data?.map((rank) => (
            <RankEditor
              key={rank.id}
              rank={rank}
              pending={saveRank.isPending}
              onSave={(data) => saveRank.mutate({ rankId: rank.id, data })}
            />
          ))}
        </div>
      </Card>
      <Card className="security-note">
        <LockKeyhole />
        <div>
          <strong>Cloudflare Access jest właściwą granicą prywatności</strong>
          <p>
            <code>robots.txt</code> ogranicza indeksowanie, ale nie zastępuje uwierzytelnienia.
            Produkcja i preview muszą mieć osobne polityki, bazy i sekrety.
          </p>
        </div>
      </Card>
    </div>
  );
}

function RankEditor({
  rank,
  pending,
  onSave,
}: {
  rank: RankSetting;
  pending: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(rank.name);
  const [threshold, setThreshold] = useState(rank.threshold_pln);
  const [description, setDescription] = useState(rank.description);
  const [reward, setReward] = useState(rank.reward_item_id ?? '');
  return (
    <div className="rank-editor-row">
      <button type="button" onClick={() => setExpanded((value) => !value)}>
        <span>{rank.name}</span>
        <strong>{Number(rank.threshold_pln).toLocaleString('pl-PL')} PLN</strong>
      </button>
      {expanded && (
        <div className="rank-editor-form">
          <label>
            Nazwa
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Próg PLN
            <input value={threshold} onChange={(event) => setThreshold(event.target.value)} />
          </label>
          <label className="wide">
            Opis
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="wide">
            ID nagrody opcjonalnej
            <input value={reward} onChange={(event) => setReward(event.target.value)} />
          </label>
          <button
            className="button"
            disabled={pending}
            type="button"
            onClick={() =>
              onSave({
                name,
                thresholdPln: threshold,
                description,
                rewardItemId: reward || null,
              })
            }
          >
            <Save size={15} /> Zapisz rangę
          </button>
        </div>
      )}
    </div>
  );
}
