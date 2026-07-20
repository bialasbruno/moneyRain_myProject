import { z } from 'zod';
import { calculateBondLive, type BondLotInput, type BondRatePeriod } from '../../src/domain/bonds';
import Decimal from 'decimal.js';
import { D, ZERO } from '../../src/domain/money';
import { DEFAULT_RANKS, progressionFor } from '../../src/domain/progression';
import { assertSameOrigin, bodyJson, errorResponse, HttpError, json, requestId } from '../lib/http';
import { quoteFor, type QuoteInstrument } from '../lib/quotes';
import {
  bondSchema,
  cashflowSchema,
  contributionSchema,
  goalSchema,
  instrumentSchema,
  rankSchema,
  rateSchema,
  settingsSchema,
  transactionSchema,
} from '../lib/schemas';
import type { AppContext, AuthData, Env } from '../lib/types';

const archiveSchema = z.object({
  version: z.literal(1),
  instruments: z.array(instrumentSchema.extend({ id: z.string().uuid() })).max(500),
  transactions: z.array(transactionSchema.extend({ id: z.string().uuid() })).max(10_000),
  bonds: z.array(bondSchema.extend({ id: z.string().uuid() })).max(2_000),
  rates: z
    .array(rateSchema.extend({ id: z.string().uuid(), bondLotId: z.string().uuid() }))
    .max(10_000),
});

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function pathParts(request: Request): string[] {
  const path = new URL(request.url).pathname.replace(/^\/api\/?/, '');
  return path.split('/').filter(Boolean).map(decodeURIComponent);
}

async function rows<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = await statement.all<T>();
  return result.results;
}

function instrumentOut(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    providerSymbol: row.provider_symbol,
    exchange: row.exchange,
    mic: row.mic,
    isin: row.isin,
    quoteCurrency: row.quote_currency,
    baseCurrency: row.base_currency,
    quoteProvider: row.quote_provider,
    manualPrice: row.manual_price,
    manualPriceUpdatedAt: row.manual_price_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transactionOut(row: Record<string, unknown>) {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    type: row.type,
    executedAt: row.executed_at,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    fee: row.fee,
    currency: row.currency,
    fxRateToPln: row.fx_rate_to_pln,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function bondOut(row: Record<string, unknown>) {
  return {
    id: row.id,
    series: row.series,
    bondType: row.bond_type,
    purchaseDate: row.purchase_date,
    maturityDate: row.maturity_date,
    quantity: row.quantity,
    nominalValuePln: row.nominal_value_pln,
    purchasePricePln: row.purchase_price_pln,
    interestHandling: row.interest_handling,
    dayCountConvention: row.day_count_convention,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rateOut(row: Record<string, unknown>) {
  return {
    id: row.id,
    bondLotId: row.bond_lot_id,
    startDate: row.start_date,
    endDate: row.end_date,
    annualRatePercent: row.annual_rate_percent,
    handlingOverride: row.handling_override,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireInstrument(env: Env, instrumentId: string) {
  const row = await env.DB.prepare('SELECT * FROM instruments WHERE id = ?')
    .bind(instrumentId)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Nie znaleziono instrumentu.');
  return row;
}

async function dashboard(env: Env) {
  const [bondRows, rateRows, cashflowRows, stateRow, rankRows] = await Promise.all([
    rows<Record<string, unknown>>(
      env.DB.prepare('SELECT * FROM bond_lots ORDER BY purchase_date, id'),
    ),
    rows<Record<string, unknown>>(
      env.DB.prepare('SELECT * FROM bond_rate_periods ORDER BY start_date, id'),
    ),
    rows<Record<string, unknown>>(
      env.DB.prepare('SELECT * FROM bond_cashflows ORDER BY payment_date, id'),
    ),
    env.DB.prepare("SELECT * FROM game_state WHERE id = 'owner'").first<Record<string, unknown>>(),
    rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM ranks ORDER BY sort_order')),
  ]);

  const valuationTime = new Date();
  let bondValue = ZERO;
  let bondPrincipal = ZERO;
  let bondCost = ZERO;
  let accruedInterest = ZERO;
  let bondProfit = ZERO;
  let accrualPerSecond = ZERO;
  const bondSummaries = bondRows.map((row) => {
    const periods: BondRatePeriod[] = rateRows
      .filter((rate) => rate.bond_lot_id === row.id)
      .map((rate) => ({
        id: String(rate.id),
        startDate: String(rate.start_date),
        endDate: String(rate.end_date),
        annualRatePercent: String(rate.annual_rate_percent),
        handlingOverride: rate.handling_override as BondRatePeriod['handlingOverride'],
      }));
    const input: BondLotInput = {
      purchaseDate: String(row.purchase_date),
      maturityDate: String(row.maturity_date),
      quantity: String(row.quantity),
      nominalValuePln: String(row.nominal_value_pln),
      purchasePricePln: String(row.purchase_price_pln),
      interestHandling: String(row.interest_handling) as BondLotInput['interestHandling'],
      dayCountConvention: String(row.day_count_convention) as BondLotInput['dayCountConvention'],
      periods,
    };
    const valuation = calculateBondLive(input, valuationTime);
    const recorded = cashflowRows
      .filter((flow) => flow.bond_lot_id === row.id)
      .reduce((sum, flow) => sum.add(String(flow.gross_amount_pln)), ZERO);
    bondValue = bondValue.add(valuation.currentValuePln);
    bondPrincipal = bondPrincipal.add(valuation.principalPln);
    bondCost = bondCost.add(D(String(row.quantity)).mul(String(row.purchase_price_pln)));
    accruedInterest = accruedInterest.add(valuation.accruedInterestPln);
    bondProfit = bondProfit.add(valuation.profitPln).add(recorded);
    accrualPerSecond = accrualPerSecond.add(valuation.accrualPerSecondPln);
    return {
      ...bondOut(row),
      periods,
      valuation: { ...valuation, recordedCashflowsPln: recorded.toString() },
    };
  });

  const totalValue = bondValue;
  const totalProfit = bondProfit;
  const totalCost = bondCost;
  const ranks = rankRows.length
    ? rankRows.map((rank) => ({
        id: String(rank.id),
        thresholdPln: String(rank.threshold_pln),
        name: String(rank.name),
        description: String(rank.description),
        rewardItemId: rank.reward_item_id ? String(rank.reward_item_id) : null,
      }))
    : DEFAULT_RANKS;
  const game = progressionFor(totalValue.toString(), Number(stateRow?.highest_level ?? 0), ranks);
  const peakValue = D(String(stateRow?.peak_value_pln ?? '0'));
  const newPeak = Decimal.max(peakValue, totalValue);

  if (game.highestLevel !== Number(stateRow?.highest_level ?? 0) || newPeak.gt(peakValue)) {
    await env.DB.prepare(
      `UPDATE game_state SET current_level=?, highest_level=?, peak_value_pln=?, updated_at=? WHERE id='owner'`,
    )
      .bind(game.currentLevel, game.highestLevel, newPeak.toString(), now())
      .run();
  } else if (game.currentLevel !== Number(stateRow?.current_level ?? 0)) {
    await env.DB.prepare("UPDATE game_state SET current_level=?, updated_at=? WHERE id='owner'")
      .bind(game.currentLevel, now())
      .run();
  }
  await unlockProgression(env, totalValue.toString(), false, bondRows.length > 0, ranks);

  return {
    asOf: valuationTime.toISOString(),
    totalValuePln: totalValue.toString(),
    totalProfitPln: totalProfit.toString(),
    returnPercent: totalCost.eq(0) ? '0' : totalProfit.div(totalCost).mul(100).toString(),
    bondsValuePln: bondValue.toString(),
    bondPrincipalPln: bondPrincipal.toString(),
    bondPurchaseCostPln: bondCost.toString(),
    accruedInterestPln: accruedInterest.toString(),
    accrualPerSecondPln: accrualPerSecond.toString(),
    bonds: bondSummaries,
    game: {
      ...game,
      effectsLevel: stateRow?.effects_level ?? 'FULL',
      soundEnabled: stateRow?.sound_enabled === 1,
    },
  };
}

async function unlockProgression(
  env: Env,
  value: string,
  hasEtf: boolean,
  hasBonds: boolean,
  ranks: Array<{ id: string; thresholdPln: string; name: string }>,
) {
  const timestamp = now();
  const statements: D1PreparedStatement[] = [];
  for (const rank of ranks.filter((item) => D(item.thresholdPln).lte(value))) {
    const eventId = id();
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO progression_events (id,event_key,type,payload,occurred_at)
         VALUES (?,?,'RANK_UNLOCK',?,?)`,
      ).bind(
        eventId,
        `rank:${rank.id}`,
        JSON.stringify({ rankId: rank.id, name: rank.name }),
        timestamp,
      ),
    );
  }
  const achievements = await rows<Record<string, unknown>>(
    env.DB.prepare('SELECT * FROM achievements'),
  );
  for (const achievement of achievements) {
    const unlocked =
      (achievement.rule_type === 'VALUE' && D(String(achievement.rule_value)).lte(value)) ||
      (achievement.rule_type === 'FIRST_INVESTMENT' && (hasEtf || hasBonds)) ||
      (achievement.rule_type === 'DIVERSIFIED' && hasEtf && hasBonds);
    if (!unlocked) continue;
    const eventId = id();
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO progression_events (id,event_key,type,payload,occurred_at)
         VALUES (?,?,'ACHIEVEMENT_UNLOCK',?,?)`,
      ).bind(
        eventId,
        `achievement:${String(achievement.id)}`,
        JSON.stringify({ achievementId: achievement.id }),
        timestamp,
      ),
      env.DB.prepare(
        `INSERT OR IGNORE INTO achievement_unlocks (achievement_id,unlocked_at,progression_event_id)
         SELECT ?,?,id FROM progression_events WHERE event_key=?`,
      ).bind(String(achievement.id), timestamp, `achievement:${String(achievement.id)}`),
    );
  }
  if (statements.length) await env.DB.batch(statements);
}

async function route(context: AppContext): Promise<Response> {
  const { request, env } = context;
  assertSameOrigin(request);
  const [resource = 'health', resourceId, action] = pathParts(request);
  const method = request.method;

  if (resource === 'health' && method === 'GET') {
    const probe = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    return json({ status: probe?.ok === 1 ? 'ok' : 'degraded', requestId: requestId(request) });
  }
  if (resource === 'dashboard' && method === 'GET') return json(await dashboard(env));

  if (resource === 'instruments') {
    if (!resourceId && method === 'GET') {
      return json(
        (
          await rows<Record<string, unknown>>(
            env.DB.prepare('SELECT * FROM instruments ORDER BY created_at DESC'),
          )
        ).map(instrumentOut),
      );
    }
    if (!resourceId && method === 'POST') {
      const data = instrumentSchema.parse(await bodyJson(request));
      const instrumentId = id();
      const timestamp = now();
      await env.DB.prepare(
        `INSERT INTO instruments (id,name,symbol,provider_symbol,exchange,mic,isin,quote_currency,base_currency,quote_provider,manual_price,manual_price_updated_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
        .bind(
          instrumentId,
          data.name,
          data.symbol,
          data.providerSymbol,
          data.exchange,
          data.mic ?? null,
          data.isin ?? null,
          data.quoteCurrency,
          data.baseCurrency,
          data.quoteProvider,
          data.manualPrice ?? null,
          data.manualPrice ? timestamp : null,
          timestamp,
          timestamp,
        )
        .run();
      return json(instrumentOut((await requireInstrument(env, instrumentId))!), 201);
    }
    const existing = await requireInstrument(env, resourceId!);
    if (action === 'test-quote' && method === 'POST') {
      return json({
        quote: await quoteFor(env, existing as unknown as QuoteInstrument, true),
        requiresConfirmation: true,
      });
    }
    if (method === 'GET') return json(instrumentOut(existing));
    if (method === 'PATCH') {
      const data = instrumentSchema.parse(await bodyJson(request));
      const timestamp = now();
      await env.DB.prepare(
        `UPDATE instruments SET name=?,symbol=?,provider_symbol=?,exchange=?,mic=?,isin=?,quote_currency=?,base_currency=?,quote_provider=?,manual_price=?,manual_price_updated_at=?,updated_at=? WHERE id=?`,
      )
        .bind(
          data.name,
          data.symbol,
          data.providerSymbol,
          data.exchange,
          data.mic ?? null,
          data.isin ?? null,
          data.quoteCurrency,
          data.baseCurrency,
          data.quoteProvider,
          data.manualPrice ?? null,
          data.manualPrice ? timestamp : null,
          timestamp,
          resourceId,
        )
        .run();
      return json(instrumentOut(await requireInstrument(env, resourceId!)));
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM instruments WHERE id=?').bind(resourceId).run();
      return new Response(null, { status: 204 });
    }
  }

  if (resource === 'transactions') {
    if (!resourceId && method === 'GET') {
      return json(
        (
          await rows<Record<string, unknown>>(
            env.DB.prepare(
              'SELECT * FROM investment_transactions ORDER BY executed_at DESC,id DESC',
            ),
          )
        ).map(transactionOut),
      );
    }
    if (!resourceId && method === 'POST') {
      const data = transactionSchema.parse(await bodyJson(request));
      await requireInstrument(env, data.instrumentId);
      const transactionId = id();
      await env.DB.prepare(
        `INSERT INTO investment_transactions (id,instrument_id,type,executed_at,quantity,unit_price,fee,currency,fx_rate_to_pln,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
        .bind(
          transactionId,
          data.instrumentId,
          data.type,
          data.executedAt,
          data.quantity,
          data.unitPrice,
          data.fee,
          data.currency,
          data.fxRateToPln,
          data.notes ?? null,
        )
        .run();
      return json(
        transactionOut(
          (await env.DB.prepare('SELECT * FROM investment_transactions WHERE id=?')
            .bind(transactionId)
            .first<Record<string, unknown>>())!,
        ),
        201,
      );
    }
    const existing = await env.DB.prepare('SELECT * FROM investment_transactions WHERE id=?')
      .bind(resourceId)
      .first<Record<string, unknown>>();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Nie znaleziono transakcji.');
    if (method === 'GET') return json(transactionOut(existing));
    if (method === 'PATCH') {
      const data = transactionSchema.parse(await bodyJson(request));
      await env.DB.prepare(
        `UPDATE investment_transactions SET instrument_id=?,type=?,executed_at=?,quantity=?,unit_price=?,fee=?,currency=?,fx_rate_to_pln=?,notes=?,updated_at=? WHERE id=?`,
      )
        .bind(
          data.instrumentId,
          data.type,
          data.executedAt,
          data.quantity,
          data.unitPrice,
          data.fee,
          data.currency,
          data.fxRateToPln,
          data.notes ?? null,
          now(),
          resourceId,
        )
        .run();
      return json(
        transactionOut(
          (await env.DB.prepare('SELECT * FROM investment_transactions WHERE id=?')
            .bind(resourceId)
            .first<Record<string, unknown>>())!,
        ),
      );
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM investment_transactions WHERE id=?').bind(resourceId).run();
      return new Response(null, { status: 204 });
    }
  }

  if (resource === 'bonds') {
    if (!resourceId && method === 'GET') {
      const bonds = (
        await rows<Record<string, unknown>>(
          env.DB.prepare('SELECT * FROM bond_lots ORDER BY purchase_date DESC'),
        )
      ).map(bondOut);
      return json(bonds);
    }
    if (!resourceId && method === 'POST') {
      const data = bondSchema.parse(await bodyJson(request));
      const bondId = id();
      await env.DB.prepare(
        `INSERT INTO bond_lots (id,series,bond_type,purchase_date,maturity_date,quantity,nominal_value_pln,purchase_price_pln,interest_handling,day_count_convention,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
        .bind(
          bondId,
          data.series,
          data.bondType,
          data.purchaseDate,
          data.maturityDate,
          data.quantity,
          data.nominalValuePln,
          data.purchasePricePln,
          data.interestHandling,
          data.dayCountConvention,
          data.notes ?? null,
        )
        .run();
      return json(
        bondOut(
          (await env.DB.prepare('SELECT * FROM bond_lots WHERE id=?')
            .bind(bondId)
            .first<Record<string, unknown>>())!,
        ),
        201,
      );
    }
    const existing = await env.DB.prepare('SELECT * FROM bond_lots WHERE id=?')
      .bind(resourceId)
      .first<Record<string, unknown>>();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Nie znaleziono partii obligacji.');
    if (action === 'rates') {
      if (method === 'GET')
        return json(
          (
            await rows<Record<string, unknown>>(
              env.DB.prepare(
                'SELECT * FROM bond_rate_periods WHERE bond_lot_id=? ORDER BY start_date',
              ).bind(resourceId),
            )
          ).map(rateOut),
        );
      if (method === 'POST') {
        const data = rateSchema.parse(await bodyJson(request));
        const rateId = id();
        await env.DB.prepare(
          `INSERT INTO bond_rate_periods (id,bond_lot_id,start_date,end_date,annual_rate_percent,handling_override) VALUES (?,?,?,?,?,?)`,
        )
          .bind(
            rateId,
            resourceId,
            data.startDate,
            data.endDate,
            data.annualRatePercent,
            data.handlingOverride ?? null,
          )
          .run();
        return json(
          rateOut(
            (await env.DB.prepare('SELECT * FROM bond_rate_periods WHERE id=?')
              .bind(rateId)
              .first<Record<string, unknown>>())!,
          ),
          201,
        );
      }
    }
    if (action === 'cashflows') {
      if (method === 'GET')
        return json(
          await rows<Record<string, unknown>>(
            env.DB.prepare(
              'SELECT * FROM bond_cashflows WHERE bond_lot_id=? ORDER BY payment_date DESC',
            ).bind(resourceId),
          ),
        );
      if (method === 'POST') {
        const data = cashflowSchema.parse(await bodyJson(request));
        const flowId = id();
        await env.DB.prepare(
          `INSERT INTO bond_cashflows (id,bond_lot_id,payment_date,gross_amount_pln,type,notes) VALUES (?,?,?,?,?,?)`,
        )
          .bind(
            flowId,
            resourceId,
            data.paymentDate,
            data.grossAmountPln,
            data.type,
            data.notes ?? null,
          )
          .run();
        return json({ id: flowId, bondLotId: resourceId, ...data }, 201);
      }
    }
    if (method === 'GET') return json(bondOut(existing));
    if (method === 'PATCH') {
      const data = bondSchema.parse(await bodyJson(request));
      await env.DB.prepare(
        `UPDATE bond_lots SET series=?,bond_type=?,purchase_date=?,maturity_date=?,quantity=?,nominal_value_pln=?,purchase_price_pln=?,interest_handling=?,day_count_convention=?,notes=?,updated_at=? WHERE id=?`,
      )
        .bind(
          data.series,
          data.bondType,
          data.purchaseDate,
          data.maturityDate,
          data.quantity,
          data.nominalValuePln,
          data.purchasePricePln,
          data.interestHandling,
          data.dayCountConvention,
          data.notes ?? null,
          now(),
          resourceId,
        )
        .run();
      return json(
        bondOut(
          (await env.DB.prepare('SELECT * FROM bond_lots WHERE id=?')
            .bind(resourceId)
            .first<Record<string, unknown>>())!,
        ),
      );
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM bond_lots WHERE id=?').bind(resourceId).run();
      return new Response(null, { status: 204 });
    }
  }

  if (resource === 'bond-rates' && resourceId) {
    const existing = await env.DB.prepare('SELECT * FROM bond_rate_periods WHERE id=?')
      .bind(resourceId)
      .first<Record<string, unknown>>();
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Nie znaleziono okresu oprocentowania.');
    if (method === 'PATCH') {
      const data = rateSchema.parse(await bodyJson(request));
      await env.DB.prepare(
        'UPDATE bond_rate_periods SET start_date=?,end_date=?,annual_rate_percent=?,handling_override=?,updated_at=? WHERE id=?',
      )
        .bind(
          data.startDate,
          data.endDate,
          data.annualRatePercent,
          data.handlingOverride ?? null,
          now(),
          resourceId,
        )
        .run();
      return json(
        rateOut(
          (await env.DB.prepare('SELECT * FROM bond_rate_periods WHERE id=?')
            .bind(resourceId)
            .first<Record<string, unknown>>())!,
        ),
      );
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM bond_rate_periods WHERE id=?').bind(resourceId).run();
      return new Response(null, { status: 204 });
    }
  }

  if (resource === 'quotes' && resourceId && method === 'GET') {
    const instrument = await requireInstrument(env, resourceId);
    return json(await quoteFor(env, instrument as unknown as QuoteInstrument));
  }

  if (resource === 'goals') {
    if (method === 'GET')
      return json(
        await rows<Record<string, unknown>>(
          env.DB.prepare('SELECT * FROM goals ORDER BY is_primary DESC, created_at'),
        ),
      );
    if (method === 'POST') {
      const data = goalSchema.parse(await bodyJson(request));
      const goalId = id();
      await env.DB.prepare(
        'INSERT INTO goals (id,name,target_amount_pln,target_date,planned_monthly_contribution_pln,icon,theme) VALUES (?,?,?,?,?,?,?)',
      )
        .bind(
          goalId,
          data.name,
          data.targetAmountPln,
          data.targetDate ?? null,
          data.plannedMonthlyContributionPln ?? null,
          data.icon ?? null,
          data.theme ?? null,
        )
        .run();
      return json({ id: goalId, ...data }, 201);
    }
  }

  if (resource === 'contributions') {
    if (method === 'GET')
      return json(
        await rows<Record<string, unknown>>(
          env.DB.prepare(
            'SELECT * FROM portfolio_contributions ORDER BY contribution_date DESC,id DESC',
          ),
        ),
      );
    if (method === 'POST') {
      const data = contributionSchema.parse(await bodyJson(request));
      const contributionId = id();
      const eventId = id();
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO portfolio_contributions (id,contribution_date,amount_pln,source,notes) VALUES (?,?,?,?,?)',
        ).bind(
          contributionId,
          data.contributionDate,
          data.amountPln,
          data.source,
          data.notes ?? null,
        ),
        env.DB.prepare(
          `INSERT INTO progression_events(id,event_key,type,payload,occurred_at) VALUES(?,?,'CONTRIBUTION',?,?)`,
        ).bind(
          eventId,
          `contribution:${contributionId}`,
          JSON.stringify({ contributionId }),
          now(),
        ),
        env.DB.prepare("UPDATE game_state SET xp=xp+100,updated_at=? WHERE id='owner'").bind(now()),
      ]);
      return json({ id: contributionId, ...data }, 201);
    }
  }

  if (resource === 'game' && method === 'GET') {
    const [state, achievements, cosmetics, events] = await Promise.all([
      env.DB.prepare("SELECT * FROM game_state WHERE id='owner'").first(),
      rows(
        env.DB.prepare(
          'SELECT a.*,u.unlocked_at FROM achievements a LEFT JOIN achievement_unlocks u ON u.achievement_id=a.id ORDER BY a.created_at',
        ),
      ),
      rows(
        env.DB.prepare(
          'SELECT c.*,u.unlocked_at,e.category AS equipped_category FROM cosmetic_items c LEFT JOIN cosmetic_unlocks u ON u.item_id=c.id LEFT JOIN equipped_items e ON e.item_id=c.id ORDER BY c.rarity,c.name',
        ),
      ),
      rows(
        env.DB.prepare(
          'SELECT * FROM progression_events WHERE animation_seen_at IS NULL ORDER BY occurred_at',
        ),
      ),
    ]);
    return json({ state, achievements, cosmetics, pendingEvents: events });
  }
  if (resource === 'game' && resourceId === 'equip' && method === 'POST') {
    const data = z.object({ itemId: z.string().max(100) }).parse(await bodyJson(request));
    const item = await env.DB.prepare(
      `SELECT c.* FROM cosmetic_items c JOIN cosmetic_unlocks u ON u.item_id=c.id WHERE c.id=?`,
    )
      .bind(data.itemId)
      .first<Record<string, unknown>>();
    if (!item)
      throw new HttpError(403, 'ITEM_LOCKED', 'Ten przedmiot nie został jeszcze odblokowany.');
    await env.DB.prepare(
      `INSERT INTO equipped_items(category,item_id,equipped_at) VALUES(?,?,?) ON CONFLICT(category) DO UPDATE SET item_id=excluded.item_id,equipped_at=excluded.equipped_at`,
    )
      .bind(item.category, data.itemId, now())
      .run();
    return json({ equipped: true, itemId: data.itemId, category: item.category });
  }
  if (resource === 'game' && resourceId === 'events' && method === 'PATCH') {
    const data = z
      .object({ eventIds: z.array(z.string().uuid()).max(50) })
      .parse(await bodyJson(request));
    if (data.eventIds.length)
      await env.DB.batch(
        data.eventIds.map((eventId) =>
          env.DB.prepare('UPDATE progression_events SET animation_seen_at=? WHERE id=?').bind(
            now(),
            eventId,
          ),
        ),
      );
    return json({ updated: data.eventIds.length });
  }

  if (resource === 'settings' && method === 'PATCH') {
    const data = settingsSchema.parse(await bodyJson(request));
    await env.DB.prepare(
      "UPDATE game_state SET effects_level=COALESCE(?,effects_level),sound_enabled=COALESCE(?,sound_enabled),updated_at=? WHERE id='owner'",
    )
      .bind(
        data.effectsLevel ?? null,
        data.soundEnabled === undefined ? null : Number(data.soundEnabled),
        now(),
      )
      .run();
    return json({ updated: true, ...data });
  }

  if (resource === 'ranks') {
    if (!resourceId && method === 'GET') {
      return json(
        await rows<Record<string, unknown>>(
          env.DB.prepare('SELECT * FROM ranks ORDER BY sort_order'),
        ),
      );
    }
    if (resourceId && method === 'PATCH') {
      const data = rankSchema.parse(await bodyJson(request));
      const current = await env.DB.prepare('SELECT id FROM ranks WHERE id=?')
        .bind(resourceId)
        .first();
      if (!current) throw new HttpError(404, 'NOT_FOUND', 'Nie znaleziono rangi.');
      await env.DB.prepare(
        'UPDATE ranks SET threshold_pln=?,name=?,description=?,reward_item_id=?,updated_at=? WHERE id=?',
      )
        .bind(
          data.thresholdPln,
          data.name,
          data.description,
          data.rewardItemId ?? null,
          now(),
          resourceId,
        )
        .run();
      return json({ id: resourceId, ...data });
    }
  }

  if (resource === 'export' && method === 'GET') {
    const [instruments, transactions, bonds, rates, cashflows, goals, contributions] =
      await Promise.all([
        rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM instruments')),
        rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM investment_transactions')),
        rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM bond_lots')),
        rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM bond_rate_periods')),
        rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM bond_cashflows')),
        rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM goals')),
        rows<Record<string, unknown>>(env.DB.prepare('SELECT * FROM portfolio_contributions')),
      ]);
    return json(
      {
        version: 1,
        exportedAt: now(),
        instruments: instruments.map(instrumentOut),
        transactions: transactions.map(transactionOut),
        bonds: bonds.map(bondOut),
        rates: rates.map(rateOut),
        cashflows,
        goals,
        contributions,
      },
      200,
      {
        'Content-Disposition': `attachment; filename="money-rain-backup-${now().slice(0, 10)}.json"`,
      },
    );
  }

  if (resource === 'import' && method === 'POST') {
    const payload = z
      .object({ archive: z.unknown(), confirm: z.boolean().default(false) })
      .parse(await bodyJson(request));
    const archive = archiveSchema.parse(payload.archive);
    const summary = {
      instruments: archive.instruments.length,
      transactions: archive.transactions.length,
      bonds: archive.bonds.length,
      rates: archive.rates.length,
    };
    if (!payload.confirm)
      return json({
        preview: true,
        valid: true,
        summary,
        warnings: ['Import dodaje dane; nie nadpisuje istniejących rekordów.'],
      });
    const statements: D1PreparedStatement[] = [];
    for (const item of archive.instruments)
      statements.push(
        env.DB.prepare(
          `INSERT INTO instruments(id,name,symbol,provider_symbol,exchange,mic,isin,quote_currency,base_currency,quote_provider,manual_price,manual_price_updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          item.id,
          item.name,
          item.symbol,
          item.providerSymbol,
          item.exchange,
          item.mic ?? null,
          item.isin ?? null,
          item.quoteCurrency,
          item.baseCurrency,
          item.quoteProvider,
          item.manualPrice ?? null,
          item.manualPrice ? now() : null,
        ),
      );
    for (const item of archive.transactions)
      statements.push(
        env.DB.prepare(
          `INSERT INTO investment_transactions(id,instrument_id,type,executed_at,quantity,unit_price,fee,currency,fx_rate_to_pln,notes) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          item.id,
          item.instrumentId,
          item.type,
          item.executedAt,
          item.quantity,
          item.unitPrice,
          item.fee,
          item.currency,
          item.fxRateToPln,
          item.notes ?? null,
        ),
      );
    for (const item of archive.bonds)
      statements.push(
        env.DB.prepare(
          `INSERT INTO bond_lots(id,series,bond_type,purchase_date,maturity_date,quantity,nominal_value_pln,purchase_price_pln,interest_handling,day_count_convention,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          item.id,
          item.series,
          item.bondType,
          item.purchaseDate,
          item.maturityDate,
          item.quantity,
          item.nominalValuePln,
          item.purchasePricePln,
          item.interestHandling,
          item.dayCountConvention,
          item.notes ?? null,
        ),
      );
    for (const item of archive.rates)
      statements.push(
        env.DB.prepare(
          `INSERT INTO bond_rate_periods(id,bond_lot_id,start_date,end_date,annual_rate_percent,handling_override) VALUES(?,?,?,?,?,?)`,
        ).bind(
          item.id,
          item.bondLotId,
          item.startDate,
          item.endDate,
          item.annualRatePercent,
          item.handlingOverride ?? null,
        ),
      );
    if (statements.length) await env.DB.batch(statements);
    return json({ imported: true, summary }, 201);
  }

  throw new HttpError(404, 'NOT_FOUND', 'Nie znaleziono endpointu.');
}

export const onRequest: PagesFunction<Env, string, AuthData> = async (context) => {
  const reqId = requestId(context.request);
  try {
    return await route(context);
  } catch (error) {
    return errorResponse(error, reqId);
  }
};
