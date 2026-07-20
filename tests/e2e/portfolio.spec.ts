import { expect, test, type Page } from '@playwright/test';
import type { DashboardData } from '../../src/types';

const emptyDashboard: DashboardData = {
  asOf: new Date().toISOString(),
  totalValuePln: '0',
  totalProfitPln: '0',
  returnPercent: '0',
  bondsValuePln: '0',
  bondPrincipalPln: '0',
  bondPurchaseCostPln: '0',
  accruedInterestPln: '0',
  accrualPerSecondPln: '0',
  bonds: [],
  game: {
    currentLevel: 0,
    highestLevel: 0,
    nextLevel: 1,
    levelProgressPercent: '0',
    missingToNextLevelPln: '100',
    millionProgressPercent: '0',
    currentRank: {
      id: 'novice',
      name: 'Nowicjusz',
      thresholdPln: '0',
      description: 'Pierwszy krok.',
    },
    nextRank: { id: 'spark', name: 'Pierwsza Iskra', thresholdPln: '1000', description: '' },
    missingToNextRankPln: '1000',
    effectsLevel: 'OFF',
    soundEnabled: false,
  },
};

async function mockApi(page: Page, effectsLevel: 'FULL' | 'LIMITED' | 'OFF' = 'OFF') {
  const bonds: Record<string, unknown>[] = [];
  const dashboard = structuredClone(emptyDashboard);
  const characterItems = [
    {
      id: 'body-starter',
      name: 'Bluza Początku',
      description: 'Pierwszy strój Twojej postaci.',
      slot: 'BODY',
      rarity: 'COMMON',
      unlock_type: 'STARTER',
      unlock_value_pln: null,
      visual_key: 'body-emerald',
      unlocked_at: '2026-07-20T10:00:00Z',
      unlock_source: 'STARTER',
      equipped_slot: 'BODY',
    },
    {
      id: 'eyes-pixel',
      name: 'Pikselowe Okulary',
      description: 'Klasyczne okulary znalezione w skrzynce.',
      slot: 'EYES',
      rarity: 'COMMON',
      unlock_type: 'CHEST',
      unlock_value_pln: null,
      visual_key: 'glasses-pixel',
      unlocked_at: null as string | null,
      unlock_source: null as string | null,
      equipped_slot: null as string | null,
    },
  ];
  const chests = [
    {
      id: 'chest-1',
      tier: 'SILVER',
      status: 'READY',
      created_at: '2026-07-20T10:00:00Z',
      opened_at: null as string | null,
      awarded_item_id: null as string | null,
      awarded_item_name: null as string | null,
      awarded_item_rarity: null as string | null,
    },
  ];
  dashboard.game.effectsLevel = effectsLevel;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api', '');
    const method = request.method();
    const fulfill = (json: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    if (path === '/dashboard') return fulfill(dashboard);
    if (path === '/bonds' && method === 'GET') return fulfill(bonds);
    if (path === '/bonds' && method === 'POST') {
      const body = request.postDataJSON() as {
        bond: Record<string, unknown>;
        firstRate?: Record<string, unknown> | null;
      };
      const item: Record<string, unknown> = {
        ...body.bond,
        id: '33333333-3333-4333-8333-333333333333',
      };
      bonds.push(item);
      dashboard.asOf = new Date().toISOString();
      dashboard.totalValuePln = '1025';
      dashboard.totalProfitPln = '25';
      dashboard.bondsValuePln = '1025';
      dashboard.bondPrincipalPln = '1000';
      dashboard.bondPurchaseCostPln = '1000';
      dashboard.accruedInterestPln = '25';
      dashboard.accrualPerSecondPln = '0.01';
      dashboard.bonds = [
        {
          id: String(item.id),
          series: String(item.series),
          bondType: String(item.bondType),
          purchaseDate: String(item.purchaseDate),
          maturityDate: String(item.maturityDate),
          quantity: String(item.quantity),
          nominalValuePln: String(item.nominalValuePln),
          purchasePricePln: String(item.purchasePricePln),
          interestHandling: String(item.interestHandling) as 'CAPITALIZE' | 'PAY_OUT',
          dayCountConvention: String(item.dayCountConvention) as 'ACT/365' | 'ACT/ACT' | '30E/360',
          valuation: {
            missingRate: !body.firstRate,
            accruedInterestPln: '25',
            currentValuePln: '1025',
            profitPln: '25',
            accrualPerSecondPln: '0.01',
          },
        },
      ];
      return fulfill(item, 201);
    }
    if (path === '/bonds/33333333-3333-4333-8333-333333333333' && method === 'DELETE') {
      bonds.splice(0, bonds.length);
      dashboard.asOf = new Date().toISOString();
      dashboard.totalValuePln = '0';
      dashboard.totalProfitPln = '0';
      dashboard.bondsValuePln = '0';
      dashboard.bondPrincipalPln = '0';
      dashboard.bondPurchaseCostPln = '0';
      dashboard.accruedInterestPln = '0';
      dashboard.accrualPerSecondPln = '0';
      dashboard.bonds = [];
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/rates') && method === 'POST') {
      dashboard.asOf = new Date().toISOString();
      dashboard.bonds[0]!.valuation.missingRate = false;
      dashboard.bonds[0]!.valuation.accruedInterestPln = '25';
      dashboard.bonds[0]!.valuation.currentValuePln = '1025';
      dashboard.bonds[0]!.valuation.profitPln = '25';
      dashboard.bonds[0]!.valuation.accrualPerSecondPln = '0.01';
      dashboard.totalValuePln = '1025';
      dashboard.totalProfitPln = '25';
      dashboard.bondsValuePln = '1025';
      dashboard.accruedInterestPln = '25';
      dashboard.accrualPerSecondPln = '0.01';
      return fulfill({ id: '44444444-4444-4444-8444-444444444444' }, 201);
    }
    if (path === '/game/chests/chest-1' && method === 'POST') {
      chests[0]!.status = 'OPENED';
      chests[0]!.opened_at = new Date().toISOString();
      chests[0]!.awarded_item_id = 'eyes-pixel';
      characterItems[1]!.unlocked_at = new Date().toISOString();
      characterItems[1]!.unlock_source = 'CHEST';
      return fulfill({ chestId: 'chest-1', item: characterItems[1], bonusXp: 0 });
    }
    if (path === '/game/equip' && method === 'POST') {
      const body = request.postDataJSON() as { itemId: string };
      const item = characterItems.find((candidate) => candidate.id === body.itemId)!;
      for (const candidate of characterItems) {
        if (candidate.slot === item.slot) candidate.equipped_slot = null;
      }
      item.equipped_slot = item.slot;
      return fulfill({ equipped: true, itemId: item.id, slot: item.slot });
    }
    if (path === '/game')
      return fulfill({
        state: { effects_level: 'OFF', sound_enabled: 0 },
        achievements: [],
        cosmetics: [],
        characterItems,
        chests,
        pendingEvents: [],
      });
    if (path === '/goals') return fulfill([]);
    if (path === '/contributions') return fulfill([]);
    return fulfill({ error: { code: 'NOT_FOUND', message: 'Brak mocka', requestId: 'e2e' } }, 404);
  });
}

test('pełna ścieżka obligacji i licznik odsetek na żywo', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page.locator('.portfolio-value')).toContainText('0,00');

  await page.goto('/etf');
  await expect(page).toHaveURL(/\/bonds$/);
  await page.getByRole('button', { name: 'Dodaj partię' }).click();
  await page.getByLabel('Seria').fill('EDO TEST');
  await page.getByLabel('Data wykupu').fill('2036-07-20');
  await page.getByLabel('Liczba sztuk').fill('10');
  await page.getByLabel('Koniec pierwszego okresu').fill('2027-07-20');
  await page.getByLabel('Oprocentowanie roczne %').fill('6.5');
  await page.getByRole('button', { name: 'Zapisz partię i oprocentowanie' }).click();
  await expect(page.getByText('EDO TEST', { exact: true })).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.locator('.portfolio-value')).toContainText('1025');
  await expect(page.getByText('SILNIK ODSETEK')).toBeVisible();
  const counter = page.locator('.engine-counter > strong');
  const before = await counter.textContent();
  await page.waitForTimeout(1_100);
  await expect(counter).not.toHaveText(before ?? '');
  await page.screenshot({
    path: `artifacts/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });

  await page.goto('/bonds');
  await page.getByRole('button', { name: 'Usuń EDO TEST' }).click();
  await expect(page.getByRole('alert')).toContainText('Usunąć serię EDO TEST?');
  await page.getByRole('button', { name: 'Usuń partię' }).click();
  await expect(page.getByText('EDO TEST', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Brak obligacji')).toBeVisible();
});

test('reduced motion zachowuje informację i fallback bez WebGL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page.getByLabel('Rdzeń Kapitału, 0.00% drogi do miliona')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('mobile uses limited scene quality', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Kontrola jakości mobilnej');
  await mockApi(page, 'LIMITED');
  await page.goto('/dashboard');
  await expect(page.locator('.core-3d[data-quality="low"]')).toBeVisible();
});

test('skrzynka odblokowuje przedmiot, który można założyć na postać', async ({
  page,
}, testInfo) => {
  await mockApi(page);
  await page.goto('/vault');
  await expect(page.getByLabel('Twoja wyposażona postać')).toBeVisible();
  await expect(page.getByText('1 czeka na otwarcie')).toBeVisible();

  await page.getByRole('button', { name: 'Otwórz' }).click();
  await expect(page.getByRole('dialog', { name: 'Nagroda ze skrzynki' })).toContainText(
    'Pikselowe Okulary',
  );
  await page.getByRole('button', { name: 'Załóż teraz' }).click();
  await page.getByRole('button', { name: 'Zamknij nagrodę' }).click();
  const glassesCard = page
    .locator('.character-item-card')
    .filter({ has: page.getByRole('heading', { name: 'Pikselowe Okulary' }) });
  await expect(glassesCard).toBeVisible();
  await expect(glassesCard.getByRole('button', { name: 'Założony' })).toBeVisible();
  await page.screenshot({ path: `artifacts/vault-${testInfo.project.name}.png`, fullPage: true });
});
