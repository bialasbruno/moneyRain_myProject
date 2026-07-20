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
      const body = request.postDataJSON() as Record<string, unknown>;
      const item: Record<string, unknown> = {
        ...body,
        id: '33333333-3333-4333-8333-333333333333',
      };
      bonds.push(item);
      dashboard.asOf = new Date().toISOString();
      dashboard.totalValuePln = '1000';
      dashboard.bondsValuePln = '1000';
      dashboard.bondPrincipalPln = '1000';
      dashboard.bondPurchaseCostPln = '1000';
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
            missingRate: true,
            accruedInterestPln: '0',
            currentValuePln: '1000',
            profitPln: '0',
            accrualPerSecondPln: '0',
          },
        },
      ];
      return fulfill(item, 201);
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
    if (path === '/game')
      return fulfill({
        state: { effects_level: 'OFF', sound_enabled: 0 },
        achievements: [],
        cosmetics: [],
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
  await page.getByRole('button', { name: 'Zapisz partię' }).click();
  await expect(page.getByText('EDO TEST')).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj okres oprocentowania' }).click();
  await page.getByLabel('Koniec okresu').fill('2027-07-20');
  await page.getByLabel('Oprocentowanie roczne').fill('6.5');
  await page.getByRole('button', { name: 'Zapisz' }).click();

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
