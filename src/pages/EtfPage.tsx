import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Beaker, CircleDollarSign, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, postJson } from '../lib/api';
import type { Instrument, Transaction } from '../types';
import {
  Card,
  ConfirmButton,
  EmptyState,
  PageHeader,
  StatusBadge,
  useToast,
} from '../components/Ui';
import { formatPln } from '../domain/money';

const instrumentFormSchema = z.object({
  name: z.string().min(1, 'Podaj nazwę').max(120),
  symbol: z.string().min(1).max(24),
  providerSymbol: z.string().min(1).max(80),
  exchange: z.string().min(1).max(80),
  mic: z.string().max(12),
  isin: z.string().max(12),
  quoteCurrency: z.string().length(3),
  baseCurrency: z.string().length(3),
  quoteProvider: z.enum(['MANUAL', 'TWELVE_DATA']),
  manualPrice: z.string(),
});
type InstrumentForm = z.infer<typeof instrumentFormSchema>;

const transactionFormSchema = z.object({
  instrumentId: z.string().uuid('Najpierw dodaj instrument'),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'FEE']),
  executedAt: z.string().min(10),
  quantity: z.string().regex(/^\d+(\.\d+)?$/),
  unitPrice: z.string().regex(/^\d+(\.\d+)?$/),
  fee: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.string().length(3),
  fxRateToPln: z.string().regex(/^\d+(\.\d+)?$/),
  notes: z.string().max(1000),
});
type TransactionForm = z.infer<typeof transactionFormSchema>;

export function EtfPage() {
  const queryClient = useQueryClient();
  const notify = useToast();
  const [showInstrument, setShowInstrument] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [testedQuote, setTestedQuote] = useState<{
    price: string;
    currency: string;
    name: string;
    exchange: string;
    marketStatus: string;
    quotedAt: string;
  } | null>(null);
  const instruments = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api<Instrument[]>('/instruments'),
  });
  const transactions = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api<Transaction[]>('/transactions'),
  });
  const instrumentForm = useForm<InstrumentForm>({
    resolver: zodResolver(instrumentFormSchema),
    defaultValues: {
      name: '',
      symbol: '',
      providerSymbol: '',
      exchange: 'Xetra',
      mic: 'XETR',
      isin: '',
      quoteCurrency: 'EUR',
      baseCurrency: 'EUR',
      quoteProvider: 'MANUAL',
      manualPrice: '',
    },
  });
  const transactionForm = useForm<TransactionForm>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      instrumentId: '',
      type: 'BUY',
      executedAt: new Date().toISOString().slice(0, 16),
      quantity: '1',
      unitPrice: '0',
      fee: '0',
      currency: 'EUR',
      fxRateToPln: '1',
      notes: '',
    },
  });

  const addInstrument = useMutation({
    mutationFn: (values: InstrumentForm) =>
      postJson<Instrument>('/instruments', {
        ...values,
        manualPrice: values.manualPrice || null,
        mic: values.mic || null,
        isin: values.isin || null,
      }),
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: ['instruments'] });
      instrumentForm.reset();
      setShowInstrument(false);
      transactionForm.setValue('instrumentId', item.id);
      notify('Instrument został dodany.');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });
  const addTransaction = useMutation({
    mutationFn: (values: TransactionForm) => postJson<Transaction>('/transactions', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowTransaction(false);
      notify('Transakcja została zapisana.');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="PORTFEL ETF"
        title="Globalna ekspozycja"
        text="Ręcznie rejestrowane transakcje, jawny kurs FX i koszt rozliczany metodą FIFO."
        action={
          <div className="header-actions">
            <button className="button secondary" onClick={() => setShowInstrument((v) => !v)}>
              <Plus size={17} />
              Instrument
            </button>
            <button
              className="button"
              onClick={() => {
                setShowTransaction((v) => !v);
                const first = instruments.data?.[0];
                if (first) {
                  transactionForm.setValue('instrumentId', first.id);
                  transactionForm.setValue('currency', first.quoteCurrency);
                }
              }}
            >
              <Plus size={17} />
              Transakcja
            </button>
          </div>
        }
      />

      {showInstrument && (
        <Card className="form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">NOWY INSTRUMENT</p>
              <h2>Dokładna identyfikacja ETF</h2>
            </div>
          </div>
          <form
            className="form-grid"
            onSubmit={instrumentForm.handleSubmit((v) => addInstrument.mutate(v))}
          >
            <Field label="Nazwa" error={instrumentForm.formState.errors.name?.message}>
              <input
                {...instrumentForm.register('name')}
                placeholder="np. iShares MSCI ACWI UCITS ETF"
              />
            </Field>
            <Field label="Ticker" error={instrumentForm.formState.errors.symbol?.message}>
              <input {...instrumentForm.register('symbol')} placeholder="IUSQ" />
            </Field>
            <Field
              label="Symbol dostawcy"
              error={instrumentForm.formState.errors.providerSymbol?.message}
            >
              <input {...instrumentForm.register('providerSymbol')} placeholder="IUSQ" />
            </Field>
            <Field label="ISIN" error={instrumentForm.formState.errors.isin?.message}>
              <input {...instrumentForm.register('isin')} placeholder="IE00B6R52259" />
            </Field>
            <Field label="Giełda">
              <input {...instrumentForm.register('exchange')} />
            </Field>
            <Field label="MIC">
              <input {...instrumentForm.register('mic')} />
            </Field>
            <Field label="Waluta notowania">
              <input {...instrumentForm.register('quoteCurrency')} />
            </Field>
            <Field label="Waluta bazowa">
              <input {...instrumentForm.register('baseCurrency')} />
            </Field>
            <Field label="Źródło ceny">
              <select {...instrumentForm.register('quoteProvider')}>
                <option value="MANUAL">Cena ręczna</option>
                <option value="TWELVE_DATA">Twelve Data</option>
              </select>
            </Field>
            <Field label="Cena ręczna">
              <input
                inputMode="decimal"
                {...instrumentForm.register('manualPrice')}
                placeholder="0.00"
              />
            </Field>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setShowInstrument(false)}
              >
                Anuluj
              </button>
              <button className="button" disabled={addInstrument.isPending}>
                Zapisz instrument
              </button>
            </div>
          </form>
        </Card>
      )}

      {showTransaction && (
        <Card className="form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">NOWY RUCH</p>
              <h2>Transakcja ETF</h2>
            </div>
          </div>
          <form
            className="form-grid"
            onSubmit={transactionForm.handleSubmit((v) => addTransaction.mutate(v))}
          >
            <Field label="Instrument">
              <select {...transactionForm.register('instrumentId')}>
                <option value="">Wybierz</option>
                {instruments.data?.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.symbol} · {i.exchange}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Typ">
              <select {...transactionForm.register('type')}>
                <option value="BUY">Zakup</option>
                <option value="SELL">Sprzedaż</option>
                <option value="DIVIDEND">Dywidenda</option>
                <option value="FEE">Opłata</option>
              </select>
            </Field>
            <Field label="Data i czas">
              <input type="datetime-local" {...transactionForm.register('executedAt')} />
            </Field>
            <Field label="Liczba jednostek">
              <input inputMode="decimal" {...transactionForm.register('quantity')} />
            </Field>
            <Field label="Cena jednostkowa">
              <input inputMode="decimal" {...transactionForm.register('unitPrice')} />
            </Field>
            <Field label="Opłata">
              <input inputMode="decimal" {...transactionForm.register('fee')} />
            </Field>
            <Field label="Waluta">
              <input {...transactionForm.register('currency')} />
            </Field>
            <Field label="Kurs do PLN">
              <input inputMode="decimal" {...transactionForm.register('fxRateToPln')} />
            </Field>
            <Field label="Notatka" wide>
              <textarea {...transactionForm.register('notes')} />
            </Field>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setShowTransaction(false)}
              >
                Anuluj
              </button>
              <button className="button" disabled={addTransaction.isPending}>
                Zapisz transakcję
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="content-grid">
        <Card className="span-2">
          <div className="card-heading">
            <div>
              <p className="eyebrow">INSTRUMENTY</p>
              <h2>Twoje ETF-y</h2>
            </div>
          </div>
          {!instruments.data?.length ? (
            <EmptyState
              icon={<CircleDollarSign />}
              title="Dodaj pierwszy ETF"
              text="Podaj dokładny ticker, ISIN, giełdę i walutę. Nie identyfikujemy funduszu tylko po indeksie."
              action={
                <button className="button" onClick={() => setShowInstrument(true)}>
                  Dodaj instrument
                </button>
              }
            />
          ) : (
            <div className="data-list">
              {instruments.data.map((instrument) => (
                <div className="data-row" key={instrument.id}>
                  <div className="asset-icon">{instrument.symbol.slice(0, 2)}</div>
                  <div className="grow">
                    <strong>{instrument.name}</strong>
                    <span>
                      {instrument.symbol} · {instrument.exchange} · {instrument.quoteCurrency}
                    </span>
                  </div>
                  <StatusBadge
                    status={instrument.quoteProvider === 'MANUAL' ? 'MANUAL' : undefined}
                  />
                  <button
                    className="button mini secondary"
                    onClick={() => {
                      setTestedQuote(null);
                      postJson<{ quote: NonNullable<typeof testedQuote> }>(
                        `/instruments/${instrument.id}/test-quote`,
                        {},
                      )
                        .then((r) => setTestedQuote(r.quote))
                        .catch((e: Error) => notify(e.message, 'error'));
                    }}
                  >
                    <Beaker size={15} />
                    Testuj
                  </button>
                  <ConfirmButton
                    className="icon-button danger"
                    onConfirm={() => {
                      void api(`/instruments/${instrument.id}`, { method: 'DELETE' })
                        .then(() => {
                          void queryClient.invalidateQueries({ queryKey: ['instruments'] });
                          notify('Instrument usunięty.');
                        })
                        .catch((e: Error) => notify(e.message, 'error'));
                    }}
                  >
                    <Trash2 size={16} />
                  </ConfirmButton>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <p className="eyebrow">NOTOWANIE</p>
              <h2>Weryfikacja</h2>
            </div>
          </div>
          {testedQuote ? (
            <div className="quote-test">
              <StatusBadge status={testedQuote.marketStatus} />
              <h3>{testedQuote.name}</h3>
              <strong>
                {testedQuote.price} {testedQuote.currency}
              </strong>
              <p>{testedQuote.exchange}</p>
              <small>{new Date(testedQuote.quotedAt).toLocaleString('pl-PL')}</small>
              <button className="button">Zatwierdzam dopasowanie</button>
            </div>
          ) : (
            <div className="mini-empty">
              <Beaker />
              <p>Uruchom test przy instrumencie. Wynik nie jest automatycznie zatwierdzany.</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="card-heading">
          <div>
            <p className="eyebrow">HISTORIA</p>
            <h2>Transakcje</h2>
          </div>
        </div>
        {!transactions.data?.length ? (
          <EmptyState
            icon={<ReceiptText />}
            title="Brak transakcji"
            text="Zakupy i sprzedaże są wprowadzane ręcznie. Architektura importu CSV może zostać dołączona później."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Typ</th>
                  <th>Instrument</th>
                  <th>Ilość</th>
                  <th>Cena</th>
                  <th>Wartość w PLN</th>
                </tr>
              </thead>
              <tbody>
                {transactions.data.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.executedAt).toLocaleDateString('pl-PL')}</td>
                    <td>
                      <span className={`tx-type ${tx.type.toLowerCase()}`}>{tx.type}</span>
                    </td>
                    <td>
                      {instruments.data?.find((i) => i.id === tx.instrumentId)?.symbol ?? '—'}
                    </td>
                    <td>{tx.quantity}</td>
                    <td>
                      {tx.unitPrice} {tx.currency}
                    </td>
                    <td>
                      {formatPln(
                        Number(tx.quantity) * Number(tx.unitPrice) * Number(tx.fxRateToPln),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
