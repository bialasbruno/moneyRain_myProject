import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2, Goal, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, PageHeader, useToast } from '../components/Ui';
import { api, postJson } from '../lib/api';
import { formatPln } from '../domain/money';
import type { DashboardData } from '../types';

const contributionSchema = z.object({
  contributionDate: z.string().min(10),
  amountPln: z.string().regex(/^\d+(\.\d+)?$/),
  source: z.string().min(1).max(80),
  notes: z.string().max(1000),
});
type ContributionForm = z.infer<typeof contributionSchema>;
const goalSchema = z.object({
  name: z.string().min(1),
  targetAmountPln: z.string().regex(/^\d+(\.\d+)?$/),
  targetDate: z.string(),
  plannedMonthlyContributionPln: z.string(),
  icon: z.string(),
  theme: z.string(),
});
type GoalForm = z.infer<typeof goalSchema>;
interface GoalData {
  id: string;
  name: string;
  target_amount_pln: string;
  target_date: string | null;
  planned_monthly_contribution_pln: string | null;
  is_primary: number;
}
interface Contribution {
  id: string;
  contribution_date: string;
  amount_pln: string;
  source: string;
}

export function GoalsPage() {
  const qc = useQueryClient();
  const notify = useToast();
  const goals = useQuery({ queryKey: ['goals'], queryFn: () => api<GoalData[]>('/goals') });
  const contributions = useQuery({
    queryKey: ['contributions'],
    queryFn: () => api<Contribution[]>('/contributions'),
  });
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/dashboard'),
  });
  const contributionForm = useForm<ContributionForm>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      contributionDate: new Date().toISOString().slice(0, 10),
      amountPln: '',
      source: 'Wpłata własna',
      notes: '',
    },
  });
  const targetForm = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmountPln: '',
      targetDate: '',
      plannedMonthlyContributionPln: '',
      icon: 'Target',
      theme: 'emerald',
    },
  });
  const addContribution = useMutation({
    mutationFn: (v: ContributionForm) =>
      postJson<{ chest: { id: string; tier: 'WOODEN' | 'SILVER' | 'GOLD' } }>('/contributions', v),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['contributions'] });
      void qc.invalidateQueries({ queryKey: ['game'] });
      contributionForm.reset();
      const tier =
        result.chest.tier === 'GOLD'
          ? 'złotą'
          : result.chest.tier === 'SILVER'
            ? 'srebrną'
            : 'drewnianą';
      notify(`Wpłata zapisana — zdobywasz ${tier} skrzynkę!`);
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const addGoal = useMutation({
    mutationFn: (v: GoalForm) =>
      postJson('/goals', {
        ...v,
        targetDate: v.targetDate || null,
        plannedMonthlyContributionPln: v.plannedMonthlyContributionPln || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] });
      targetForm.reset();
      notify('Cel został dodany.');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const value = Number(dashboard.data?.totalValuePln ?? 0);
  return (
    <div className="page">
      <PageHeader
        eyebrow="CELE I REGULARNOŚĆ"
        title="Kapitał z intencją"
        text="Wpłata oznacza nowy kapitał z zewnątrz i daje skrzynkę dla postaci. Sprzedaż ani ponowny zakup nie tworzą nagród."
      />
      <div className="goals-grid">
        <div className="goal-list">
          {goals.data?.map((goal) => {
            const progress = Math.min(100, (value / Number(goal.target_amount_pln)) * 100);
            return (
              <Card className="goal-card" key={goal.id}>
                <div className="goal-icon">
                  <Goal />
                </div>
                <div className="grow">
                  <div className="goal-title">
                    <div>
                      <p className="eyebrow">{goal.is_primary ? 'CEL GŁÓWNY' : 'CEL POŚREDNI'}</p>
                      <h2>{goal.name}</h2>
                    </div>
                    <strong>{progress.toFixed(1)}%</strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="goal-meta">
                    <span>
                      {formatPln(value, 0)} z {formatPln(goal.target_amount_pln, 0)}
                    </span>
                    <span>
                      {goal.target_date
                        ? new Date(goal.target_date).toLocaleDateString('pl-PL')
                        : 'Bez terminu'}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <Card className="form-card compact">
          <p className="eyebrow">NOWY CEL</p>
          <h2>Dodaj kamień pośredni</h2>
          <form className="stack-form" onSubmit={targetForm.handleSubmit((v) => addGoal.mutate(v))}>
            <label>
              Nazwa
              <input {...targetForm.register('name')} placeholder="Poduszka bezpieczeństwa" />
            </label>
            <label>
              Kwota docelowa
              <input {...targetForm.register('targetAmountPln')} placeholder="50000" />
            </label>
            <label>
              Data opcjonalna
              <input type="date" {...targetForm.register('targetDate')} />
            </label>
            <label>
              Miesięczna wpłata
              <input {...targetForm.register('plannedMonthlyContributionPln')} placeholder="2000" />
            </label>
            <button className="button">
              <Plus size={16} />
              Dodaj cel
            </button>
          </form>
        </Card>
      </div>
      <div className="goals-grid">
        <Card className="form-card compact">
          <p className="eyebrow">WPŁATA ZEWNĘTRZNA</p>
          <h2>Zaksięguj regularność</h2>
          <form
            className="stack-form"
            onSubmit={contributionForm.handleSubmit((v) => addContribution.mutate(v))}
          >
            <label>
              Data
              <input type="date" {...contributionForm.register('contributionDate')} />
            </label>
            <label>
              Kwota PLN
              <input {...contributionForm.register('amountPln')} placeholder="2000" />
            </label>
            <label>
              Źródło
              <input {...contributionForm.register('source')} />
            </label>
            <label>
              Notatka
              <textarea {...contributionForm.register('notes')} />
            </label>
            <button className="button">
              <Wallet size={16} />
              Zapisz wpłatę i odbierz skrzynkę
            </button>
          </form>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <p className="eyebrow">HISTORIA WPŁAT</p>
              <h2>Konsekwencja</h2>
            </div>
            <CalendarCheck />
          </div>
          <div className="data-list">
            {contributions.data?.map((item) => (
              <div className="data-row" key={item.id}>
                <div className="asset-icon">
                  <Wallet size={17} />
                </div>
                <div className="grow">
                  <strong>{formatPln(item.amount_pln)}</strong>
                  <span>{item.source}</span>
                </div>
                <time>{new Date(item.contribution_date).toLocaleDateString('pl-PL')}</time>
              </div>
            ))}
            {!contributions.data?.length && (
              <p className="muted">Nie zarejestrowano jeszcze żadnej wpłaty.</p>
            )}
          </div>
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <p className="eyebrow">BEZPIECZNE ZADANIA</p>
            <h2>Rytuał miesiąca</h2>
          </div>
          <ShieldCheck />
        </div>
        <div className="safe-task-grid">
          {[
            'Uzupełnij brakujące dane aktywa',
            'Zapisz planowaną miesięczną wpłatę',
            'Zaktualizuj znane oprocentowanie obligacji',
            'Wykonaj kopię zapasową',
            'Sprawdź postęp miesiąca',
            'Oceń postęp do progu oszczędności',
          ].map((task) => (
            <div className="safe-task" key={task}>
              <CheckCircle2 size={16} />
              <span>{task}</span>
            </div>
          ))}
        </div>
        <p className="task-note">Zadania nie sugerują zakupu, handlu ani zwiększania ryzyka.</p>
      </Card>
    </div>
  );
}
