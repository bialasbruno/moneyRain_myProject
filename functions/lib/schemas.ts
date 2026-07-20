import { z } from 'zod';
import Decimal from 'decimal.js';

const decimal = z
  .string()
  .trim()
  .regex(/^-?\d+(?:\.\d+)?$/, 'Podaj liczbę dziesiętną z kropką.');
const positiveDecimal = decimal.refine(
  (value) => new Decimal(value).gt(0),
  'Wartość musi być dodatnia.',
);
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/, 'Podaj poprawną datę.');

export const instrumentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  symbol: z.string().trim().min(1).max(24),
  providerSymbol: z.string().trim().min(1).max(80),
  exchange: z.string().trim().min(1).max(80),
  mic: optionalText(12),
  isin: optionalText(12),
  quoteCurrency: z.string().trim().length(3).toUpperCase(),
  baseCurrency: z.string().trim().length(3).toUpperCase(),
  quoteProvider: z.enum(['MANUAL', 'TWELVE_DATA']),
  manualPrice: decimal.optional().nullable(),
});

export const transactionSchema = z.object({
  instrumentId: z.string().uuid(),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'FEE']),
  executedAt: isoDate,
  quantity: decimal,
  unitPrice: decimal,
  fee: decimal.default('0'),
  currency: z.string().trim().length(3).toUpperCase(),
  fxRateToPln: positiveDecimal,
  notes: optionalText(1000),
});

export const bondSchema = z
  .object({
    series: z.string().trim().min(1).max(32),
    bondType: z.string().trim().min(1).max(80),
    purchaseDate: isoDate,
    maturityDate: isoDate,
    quantity: positiveDecimal,
    nominalValuePln: positiveDecimal,
    purchasePricePln: positiveDecimal,
    interestHandling: z.enum(['CAPITALIZE', 'PAY_OUT']),
    dayCountConvention: z.enum(['ACT/365', 'ACT/ACT', '30E/360']),
    notes: optionalText(1000),
  })
  .refine((data) => data.maturityDate > data.purchaseDate, {
    message: 'Data wykupu musi być późniejsza od daty zakupu.',
  });

export const rateSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    annualRatePercent: decimal,
    handlingOverride: z.enum(['CAPITALIZE', 'PAY_OUT']).optional().nullable(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'Koniec okresu musi być późniejszy.',
  });

export const bondCreateSchema = z
  .object({
    bond: bondSchema,
    firstRate: rateSchema.optional().nullable(),
  })
  .superRefine(({ bond, firstRate }, context) => {
    if (!firstRate) return;
    if (firstRate.startDate < bond.purchaseDate) {
      context.addIssue({
        code: 'custom',
        path: ['firstRate', 'startDate'],
        message: 'Pierwszy okres nie może zaczynać się przed zakupem.',
      });
    }
    if (firstRate.endDate > bond.maturityDate) {
      context.addIssue({
        code: 'custom',
        path: ['firstRate', 'endDate'],
        message: 'Pierwszy okres nie może kończyć się po wykupie.',
      });
    }
  });

export const cashflowSchema = z.object({
  paymentDate: isoDate,
  grossAmountPln: positiveDecimal,
  type: z.enum(['INTEREST', 'REDEMPTION', 'EARLY_REDEMPTION']),
  notes: optionalText(1000),
});

export const contributionSchema = z.object({
  contributionDate: isoDate,
  amountPln: positiveDecimal,
  source: z.string().trim().min(1).max(80),
  notes: optionalText(1000),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmountPln: positiveDecimal,
  targetDate: isoDate.optional().nullable(),
  plannedMonthlyContributionPln: positiveDecimal.optional().nullable(),
  icon: optionalText(32),
  theme: optionalText(32),
});

export const settingsSchema = z.object({
  effectsLevel: z.enum(['FULL', 'LIMITED', 'OFF']).optional(),
  soundEnabled: z.boolean().optional(),
});

export const rankSchema = z.object({
  thresholdPln: decimal.refine((value) => new Decimal(value).gte(0)),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  rewardItemId: z.string().max(100).optional().nullable(),
});
