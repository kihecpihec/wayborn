import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { register } from './accountFixture';
import { stubGps } from './gps';

const map = (page: Page) => page.frameLocator('iframe[title="Wayborn map"]');
const home = (page: Page) => page.getByTestId('map-home');
const distance = async (page: Page) =>
  Number((await home(page).getByText(/^\d+ m · /).innerText()).split(' ')[0]);
const tilePng = readFileSync(join(__dirname, '../assets/wayborn-icon.png'));
const tileHosts = /tile\.openstreetmap\.org|tiles\.openfreemap\.org|overpass|maps\.mail\.ru/;

// Records two walking readings and waits until the second has been accepted.
async function startWalk(page: Page) {
  await home(page).getByRole('button', { name: 'Start walk', exact: true }).click();
  await expect(home(page).getByText('Recording walk', { exact: true })).toBeVisible();
  await expect(home(page).getByText(/^1\d m · /)).toBeVisible();
}

test('MAP-01: panning, switching style and recentering leave the walk unchanged', async ({ page }) => {
  await stubGps(page, 'walk');
  await register(page);
  await startWalk(page);
  const before = await distance(page);
  const box = (await page.getByTestId('map-screen').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2 + 120, { steps: 8 });
  await page.mouse.up();
  await home(page).getByRole('switch', { name: 'Pixel map' }).click();
  await expect(home(page).getByText('Standard map', { exact: true })).toBeVisible();
  await home(page).getByRole('switch', { name: 'Pixel map' }).click();
  await expect(home(page).getByText('Pixel map', { exact: true })).toBeVisible();
  await home(page).getByRole('button', { name: 'Recenter on walk' }).click();
  await expect(home(page).getByText('Recording walk', { exact: true })).toBeVisible();
  expect(await distance(page)).toBe(before);
  await home(page).getByRole('button', { name: 'Pause walk', exact: true }).click();
  await expect(home(page).getByRole('button', { name: 'Resume walk', exact: true })).toBeVisible();
  expect(await distance(page)).toBe(before);
});

test('MAP-02: unavailable tiles show retry and the walk is still recorded', async ({ page }) => {
  let tilesUp = false;
  await page.context().route(tileHosts, (route) =>
    tilesUp && /tile\.openstreetmap\.org/.test(route.request().url())
      ? route.fulfill({ contentType: 'image/png', body: tilePng })
      : route.abort('internetdisconnected'));
  await stubGps(page, 'walk');
  await register(page);
  await expect(map(page).getByText('Map tiles unavailable. Check your connection.')).toBeVisible({ timeout: 10000 });
  await expect(map(page).getByRole('button', { name: 'Retry map' })).toBeVisible();
  await startWalk(page);
  const walked = await distance(page);
  await home(page).getByRole('button', { name: 'Pause walk', exact: true }).click();
  await home(page).getByRole('button', { name: 'Finish walk', exact: true }).click();
  await home(page).getByRole('button', { name: 'Confirm finish', exact: true }).click();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  const activity = page.getByTestId('activity-screen');
  await expect(activity.getByRole('heading', { name: 'Walk 1', exact: true })).toBeVisible();
  await expect(activity.getByText(new RegExp(`^Completed · ${walked} m · `))).toBeVisible();
  await page.getByRole('tab', { name: 'Map', exact: true }).click();
  tilesUp = true;
  await map(page).getByRole('button', { name: 'Retry map' }).click();
  await expect(map(page).locator('#map-feedback')).toBeHidden({ timeout: 10000 });
});

test('MAP-03: both map styles keep provider attribution', async ({ page }) => {
  await page.context().route(/tile\.openstreetmap\.org/, (route) =>
    route.fulfill({ contentType: 'image/png', body: tilePng }));
  await stubGps(page, 'forbid');
  await register(page);
  const attribution = map(page).locator('.leaflet-control-attribution');
  await expect(attribution).toContainText('OpenStreetMap contributors');
  await expect(attribution).toContainText('OpenMapTiles');
  await expect(attribution).toContainText('OpenFreeMap');
  await home(page).getByRole('switch', { name: 'Pixel map' }).click();
  await expect(home(page).getByText('Standard map', { exact: true })).toBeVisible();
  await expect(attribution).toContainText('OpenStreetMap contributors');
  await expect(attribution).toBeVisible();
});

test('LIFE-01: denied location shows the denial and browsing continues without progress', async ({ page }) => {
  await stubGps(page, 'deny');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await register(page);
  await home(page).getByRole('button', { name: 'Start walk', exact: true }).click();
  await expect(home(page).getByRole('alert')).toHaveText(
    'Location access was not allowed. You can keep browsing the map; allow location to record a walk.');
  await expect(home(page).getByRole('button', { name: 'Start walk', exact: true })).toBeEnabled();
  await expect(home(page).getByRole('button', { name: 'Finish walk', exact: true })).toHaveCount(0);
  await expect(home(page).getByText(/ m · /)).toHaveCount(0);
  await expect(page.getByTestId('map-screen')).toBeVisible();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  const activity = page.getByTestId('activity-screen');
  await expect(activity.getByText('No walk this session.', { exact: true })).toBeVisible();
  await expect(activity.getByText(/^Completed · /)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Guild', exact: true }).click();
  await expect(page.getByTestId('guild-screen').getByText('Guilds are not available yet')).toBeVisible();
  await page.getByRole('tab', { name: 'Map', exact: true }).click();
  await expect(home(page).getByText('Ljubljana map preview', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('LIFE-03: waiting on the idle map accrues no time or walk', async ({ page }) => {
  await stubGps(page, 'forbid');
  await page.clock.install();
  await register(page);
  await page.clock.runFor(120_000);
  await expect(home(page).getByText('Ljubljana map preview', { exact: true })).toBeVisible();
  await expect(home(page).getByText(/ m · /)).toHaveCount(0);
  await expect(home(page).getByRole('button', { name: 'Start walk', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(page.getByTestId('activity-screen').getByText('No walk this session.', { exact: true })).toBeVisible();
});

test('ACCESS-03: location use is explained before any request and walk controls are labeled', async ({ page }) => {
  await stubGps(page, 'walk');
  await register(page);
  await expect(home(page).getByText(
    'Wayborn uses your location only while a walk you started is recording with the app open. Browsing the map never uses it.',
    { exact: true })).toBeVisible();
  await expect(home(page).getByText(
    'Stay aware of your surroundings. Wayborn does not check whether a route is safe or open to the public.',
    { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { gpsProbes?: number }).gpsProbes)).toBeUndefined();
  const tall = async (name: string) => {
    const button = home(page).getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    return button;
  };
  await (await tall('Start walk')).click();
  await expect(home(page).getByText(/^1\d m · /)).toBeVisible();
  await (await tall('Pause walk')).click();
  await (await tall('Finish walk')).click();
  await (await tall('Confirm finish')).click();
  await expect(home(page).getByText('Walk finished', { exact: true })).toBeVisible();
});

test('STARTUP-01: a returning player opens to the map within 3 s on a slow network', async ({ page }) => {
  await stubGps(page, 'forbid');
  await register(page);
  // The saved access token has run out, so restoring needs a refresh the network is slow to answer.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))!;
    const session = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...session, expires_at: Math.floor(Date.now() / 1000) - 60 }));
  });
  await page.route(/\/auth\/v1\//, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    await route.continue().catch(() => undefined);
  });
  const opened = Date.now();
  await page.reload();
  await expect(home(page).getByText('Ljubljana map preview', { exact: true })).toBeVisible({ timeout: 3000 });
  expect(Date.now() - opened).toBeLessThan(3000);
  await expect(home(page).getByRole('button', { name: 'Start walk', exact: true })).toBeVisible();
  await expect(page.getByLabel('Email address', { exact: true })).toHaveCount(0);
  await expect(home(page).getByText('Recording walk', { exact: true })).toHaveCount(0);
});
