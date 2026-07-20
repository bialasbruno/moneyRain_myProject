import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Gauge, Landmark, Plus, Radio, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Card, EmptyState, PageHeader, useToast } from '../components/Ui';
import { api, postJson } from '../lib/api';
import type { Bond, DashboardData } from '../types';
import { formatPln, formatPrecisePln } from '../domain/money';
import { liveAccruedValue, useLiveClock } from '../hooks/useLiveAccrual';

const schema = z
  .object({
    series: z.string().min(1),
    bondType: z.string().min(1),
    purchaseDate: z.string().min(10),
    maturityDate: z.string().min(10),
    quantity: z.string().regex(/^\d+(\.\d+)?$/),
    nominalValuePln: z.string().regex(/^\d+(\.\d+)?$/),
    purchasePricePln: z.string().regex(/^\d+(\.\d+)?$/),
    interestHandling: z.enum(['CAPITALIZE', 'PAY_OUT']),
    dayCountConvention: z.enum(['ACT/365', 'ACT/ACT', '30E/360']),
    notes: z.string().max(1000),
    includeFirstRate: z.boolean(),
    rateStartDate: z.string(),
    rateEndDate: z.string(),
    initialAnnualRatePercent: z.string(),
    initialHandlingOverride: z.enum(['', 'CAPITALIZE', 'PAY_OUT']),
  })
  .superRefine((data, context) => {
    if (data.maturityDate <= data.purchaseDate) {
      context.addIssue({
        code: 'custom',
        path: ['maturityDate'],
        message: 'Data wykupu musi być późniejsza od daty zakupu.',
      });
    }
    if (!data.includeFirstRate) return;
    if (data.rateStartDate.length < 10)
      context.addIssue({
        code: 'custom',
        path: ['rateStartDate'],
        message: 'Podaj początek okresu.',
      });
    if (data.rateEndDate.length < 10)
      context.addIssue({ code: 'custom', path: ['rateEndDate'], message: 'Podaj koniec okresu.' });
    if (!/^\d+(\.\d+)?$/.test(data.initialAnnualRatePercent))
      context.addIssue({
        code: 'custom',
        path: ['initialAnnualRatePercent'],
        message: 'Podaj oprocentowanie.',
      });
    if (data.rateEndDate && data.rateEndDate <= data.rateStartDate) {
      context.addIssue({
        code: 'custom',
        path: ['rateEndDate'],
        message: 'Koniec okresu musi być późniejszy.',
      });
    }
    if (data.rateStartDate < data.purchaseDate) {
      context.addIssue({
        code: 'custom',
        path: ['rateStartDate'],
        message: 'Okres nie może zaczynać się przed zakupem.',
      });
    }
    if (data.rateEndDate > data.maturityDate) {
      context.addIssue({
        code: 'custom',
        path: ['rateEndDate'],
        message: 'Okres nie może kończyć się po wykupie.',
      });
    }
  });
type FormData = z.infer<typeof schema>;
const rateSchema = z.object({
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  annualRatePercent: z.string().regex(/^\d+(\.\d+)?$/),
  handlingOverride: z.enum(['', 'CAPITALIZE', 'PAY_OUT']),
});
type RateForm = z.infer<typeof rateSchema>;

export function BondsPage() {
  const timestamp = useLiveClock();
  const [showForm, setShowForm] = useState(false);
  const [rateFor, setRateFor] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);
  const qc = useQueryClient();
  const notify = useToast();
  const bonds = useQuery({ queryKey: ['bonds'], queryFn: () => api<Bond[]>('/bonds') });
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/dashboard'),
    refetchInterval: 60_000,
  });
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      series: '',
      bondType: 'Detaliczne obligacje skarbowe',
      purchaseDate: new Date().toISOString().slice(0, 10),
      maturityDate: '',
      quantity: '1',
      nominalValuePln: '100',
      purchasePricePln: '100',
      interestHandling: 'CAPITALIZE',
      dayCountConvention: 'ACT/ACT',
      notes: '',
      includeFirstRate: true,
      rateStartDate: new Date().toISOString().slice(0, 10),
      rateEndDate: '',
      initialAnnualRatePercent: '',
      initialHandlingOverride: '',
    },
  });
  const rateForm = useForm<RateForm>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      annualRatePercent: '',
      handlingOverride: '',
    },
  });
  const includeFirstRate = useWatch({ control: form.control, name: 'includeFirstRate' });
  const add = useMutation({
    mutationFn: (v: FormData) => {
      const {
        includeFirstRate: include,
        rateStartDate,
        rateEndDate,
        initialAnnualRatePercent,
        initialHandlingOverride,
        ...bond
      } = v;
      return postJson<Bond>('/bonds', {
        bond,
        firstRate: include
          ? {
              startDate: rateStartDate,
              endDate: rateEndDate,
              annualRatePercent: initialAnnualRatePercent,
              handlingOverride: initialHandlingOverride || null,
            }
          : null,
      });
    },
    onSuccess: (_bond, variables) => {
      void qc.invalidateQueries({ queryKey: ['bonds'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowForm(false);
      notify(
        variables.includeFirstRate
          ? 'Partia obligacji i oprocentowanie zostały dodane.'
          : 'Partia obligacji została dodana.',
      );
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const addRate = useMutation({
    mutationFn: (v: RateForm) =>
      postJson(`/bonds/${rateFor}/rates`, { ...v, handlingOverride: v.handlingOverride || null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      setRateFor(null);
      notify('Okres oprocentowania został zapisany.');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const removeBond = useMutation({
    mutationFn: (bondId: string) => api<void>(`/bonds/${bondId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bonds'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteFor(null);
      notify('Partia obligacji została usunięta.');
    },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const valuations = dashboard.data?.bonds ?? [];
  const liveTotal = dashboard.data
    ? liveAccruedValue(
        dashboard.data.bondsValuePln,
        dashboard.data.accrualPerSecondPln,
        dashboard.data.asOf,
        timestamp,
      )
    : '0';
  const liveInterest = dashboard.data
    ? liveAccruedValue(
        dashboard.data.accruedInterestPln,
        dashboard.data.accrualPerSecondPln,
        dashboard.data.asOf,
        timestamp,
      )
    : '0';
  return (
    <div className="page">
      <PageHeader
        eyebrow="OBLIGACJE SKARBOWE"
        title="Twój skarbiec obligacji"
        text="Dodawaj partie i ich rzeczywiste okresy oprocentowania. Odsetki zobaczysz narastająco co sekundę."
        action={
          <button className="button" onClick={() => setShowForm((v) => !v)}>
            <Plus size={17} />
            Dodaj partię
          </button>
        }
      />
      <Card className="bond-live-summary">
        <div className="bond-live-copy">
          <div className="live-ticker">
            <span className="live-dot" />
            LICZNIK NA ŻYWO
          </div>
          <span>Łączna wartość obligacji</span>
          <strong>{formatPrecisePln(liveTotal)}</strong>
        </div>
        <div className="bond-live-stats">
          <span>
            <small>NAROSŁE ODSETKI</small>
            <strong>{formatPrecisePln(liveInterest)}</strong>
          </span>
          <span>
            <small>TEMPO</small>
            <strong>
              <Gauge size={16} /> +{formatPrecisePln(dashboard.data?.accrualPerSecondPln ?? 0)}/s
            </strong>
          </span>
        </div>
      </Card>
      {showForm && (
        <Card className="form-card">
          <form className="form-grid" onSubmit={form.handleSubmit((v) => add.mutate(v))}>
            <Field label="Seria">
              <input {...form.register('series')} placeholder="np. EDO0736" />
            </Field>
            <Field label="Typ">
              <input {...form.register('bondType')} />
            </Field>
            <Field label="Data zakupu">
              <input type="date" {...form.register('purchaseDate')} />
            </Field>
            <Field label="Data wykupu" error={form.formState.errors.maturityDate?.message}>
              <input type="date" {...form.register('maturityDate')} />
            </Field>
            <Field label="Liczba sztuk">
              <input {...form.register('quantity')} />
            </Field>
            <Field label="Nominał PLN">
              <input {...form.register('nominalValuePln')} />
            </Field>
            <Field label="Cena zakupu PLN">
              <input {...form.register('purchasePricePln')} />
            </Field>
            <Field label="Obsługa odsetek">
              <select {...form.register('interestHandling')}>
                <option value="CAPITALIZE">Kapitalizacja</option>
                <option value="PAY_OUT">Wypłata</option>
              </select>
            </Field>
            <Field label="Day-count">
              <select {...form.register('dayCountConvention')}>
                <option>ACT/ACT</option>
                <option>ACT/365</option>
                <option>30E/360</option>
              </select>
            </Field>
            <Field label="Notatka">
              <input {...form.register('notes')} />
            </Field>
            <label className="initial-rate-toggle">
              <input type="checkbox" {...form.register('includeFirstRate')} />
              <span>
                <strong>Dodaj od razu oprocentowanie</strong>
                <small>Licznik odsetek ruszy natychmiast po zapisaniu partii.</small>
              </span>
            </label>
            {includeFirstRate && (
              <div className="initial-rate-fields">
                <Field
                  label="Początek pierwszego okresu"
                  error={form.formState.errors.rateStartDate?.message}
                >
                  <input type="date" {...form.register('rateStartDate')} />
                </Field>
                <Field
                  label="Koniec pierwszego okresu"
                  error={form.formState.errors.rateEndDate?.message}
                >
                  <input type="date" {...form.register('rateEndDate')} />
                </Field>
                <Field
                  label="Oprocentowanie roczne %"
                  error={form.formState.errors.initialAnnualRatePercent?.message}
                >
                  <input placeholder="np. 6.5" {...form.register('initialAnnualRatePercent')} />
                </Field>
                <Field label="Obsługa pierwszego okresu">
                  <select {...form.register('initialHandlingOverride')}>
                    <option value="">Jak w partii</option>
                    <option value="CAPITALIZE">Kapitalizacja</option>
                    <option value="PAY_OUT">Wypłata</option>
                  </select>
                </Field>
              </div>
            )}
            <div className="form-actions">
              <button className="button ghost" type="button" onClick={() => setShowForm(false)}>
                Anuluj
              </button>
              <button className="button" disabled={add.isPending}>
                {includeFirstRate ? 'Zapisz partię i oprocentowanie' : 'Zapisz partię'}
              </button>
            </div>
          </form>
        </Card>
      )}
      {!bonds.data?.length ? (
        <Card>
          <EmptyState
            icon={<Landmark />}
            title="Brak obligacji"
            text="Dodaj partię, a następnie wpisz rzeczywiste oprocentowanie każdego okresu. Aplikacja nie przewiduje inflacji ani stopy NBP."
          />
        </Card>
      ) : (
        <div className="bond-grid">
          {bonds.data.map((bond) => {
            const view = valuations.find((v) => v.id === bond.id);
            const liveBondValue = view
              ? liveAccruedValue(
                  view.valuation.currentValuePln,
                  view.valuation.accrualPerSecondPln,
                  dashboard.data?.asOf ?? new Date(timestamp).toISOString(),
                  timestamp,
                )
              : String(Number(bond.quantity) * Number(bond.nominalValuePln));
            const liveBondInterest = view
              ? liveAccruedValue(
                  view.valuation.accruedInterestPln,
                  view.valuation.accrualPerSecondPln,
                  dashboard.data?.asOf ?? new Date(timestamp).toISOString(),
                  timestamp,
                )
              : '0';
            return (
              <Card className="bond-card" key={bond.id}>
                <div className="bond-top">
                  <div className="asset-icon gold">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <p className="eyebrow">SERIA</p>
                    <h2>{bond.series}</h2>
                    <span>{bond.bondType}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-button danger bond-delete-button"
                    aria-label={`Usuń ${bond.series}`}
                    onClick={() => setDeleteFor(bond.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="bond-value">
                  <span>Wartość na żywo</span>
                  <strong>{formatPrecisePln(liveBondValue)}</strong>
                  {!view?.valuation.missingRate && view && (
                    <small className="bond-rate-live">
                      <Radio size={13} /> +{formatPrecisePln(view.valuation.accrualPerSecondPln)}/s
                    </small>
                  )}
                </div>
                <div className="bond-meta">
                  <span>
                    <small>WYKUP</small>
                    {new Date(bond.maturityDate).toLocaleDateString('pl-PL')}
                  </span>
                  <span>
                    <small>ODSETKI</small>
                    {formatPln(liveBondInterest)}
                  </span>
                  <span>
                    <small>KONWENCJA</small>
                    {bond.dayCountConvention}
                  </span>
                </div>
                {view?.valuation.missingRate && (
                  <div className="inline-warning">
                    <TriangleAlert size={16} />
                    Brak oprocentowania dla bieżącego okresu — niczego nie prognozujemy.
                  </div>
                )}
                {deleteFor === bond.id && (
                  <div className="bond-delete-confirm" role="alert">
                    <div>
                      <strong>Usunąć serię {bond.series}?</strong>
                      <span>Usuniemy też jej okresy oprocentowania i zapisane przepływy.</span>
                    </div>
                    <div>
                      <button className="button ghost" onClick={() => setDeleteFor(null)}>
                        Anuluj
                      </button>
                      <button
                        className="button danger"
                        onClick={() => removeBond.mutate(bond.id)}
                        disabled={removeBond.isPending}
                      >
                        Usuń partię
                      </button>
                    </div>
                  </div>
                )}
                <button className="button secondary full" onClick={() => setRateFor(bond.id)}>
                  <CalendarRange size={16} />
                  Dodaj okres oprocentowania
                </button>
                {rateFor === bond.id && (
                  <form
                    className="inline-form"
                    onSubmit={rateForm.handleSubmit((v) => addRate.mutate(v))}
                  >
                    <input
                      aria-label="Początek okresu"
                      type="date"
                      {...rateForm.register('startDate')}
                    />
                    <input
                      aria-label="Koniec okresu"
                      type="date"
                      {...rateForm.register('endDate')}
                    />
                    <input
                      aria-label="Oprocentowanie roczne"
                      placeholder="% rocznie"
                      {...rateForm.register('annualRatePercent')}
                    />
                    <select aria-label="Obsługa okresu" {...rateForm.register('handlingOverride')}>
                      <option value="">Jak w partii</option>
                      <option value="CAPITALIZE">Kapitalizacja</option>
                      <option value="PAY_OUT">Wypłata</option>
                    </select>
                    <button className="button">Zapisz</button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <p className="disclaimer">
        Wycena ma charakter szacunkowy; oficjalne tabele emisyjne mogą stosować inne zasady
        zaokrągleń.
      </p>
    </div>
  );
}
function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
