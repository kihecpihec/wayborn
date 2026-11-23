import { register } from './accountFixture';
import { test, expect, type Page } from '@playwright/test';

// Browser GPS stub: each reading is 10 s and about 11 m after the previous one,
// so the walk logic accepts it as walking. Unexpected access can be made to throw.
async function stubGps(page: Page, behaviour: 'forbid' | 'walk') {
  await page.addInitScript((mode) => {
    let reading = 0;
    let watches = 0;
    Object.defineProperty(navigator, 'geolocation', { value: {
      watchPosition(success: (p: unknown) => void) {
        if (mode === 'forbid') throw new Error('Unexpected GPS request while browsing');
        const send = () => {
          reading += 1;
          success({ timestamp: 1_000_000 + reading * 10_000, coords: { latitude: 46 + reading * 0.0001, longitude: 14, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null } });
        };
        setTimeout(send, 50);
        setTimeout(send, 150);
        // expo-location tags events with this id, so each watch needs its own.
        return ++watches;
      },
      getCurrentPosition(success: (p: unknown) => void) {
        if (mode === 'forbid') throw new Error('Unexpected GPS request while browsing');
        // The browser permission probe: grants access without producing a walk fix.
        success({ timestamp: 1, coords: { latitude: 46, longitude: 14, accuracy: 5 } });
      },
      clearWatch() {},
    } });
  }, behaviour);
}

test('NAV-04: browse all destinations without starting GPS or a walk', async ({ page }) => {
  await stubGps(page, 'forbid');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await register(page);
  for (const [title, text] of [['Activity', 'No walk this session'], ['Guild', 'Guilds are not available yet'], ['Goals', 'Goals are not available yet'], ['Profile', 'Sign out']]) {
    await page.getByRole('tab', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByText(text).first()).toBeVisible();
  }
  await page.getByRole('tab', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start walk', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finish walk', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('NAV-05: completed walks accumulate in Activity', async ({ page }) => {
  await stubGps(page, 'walk');
  await register(page);
  const bounds = await page.getByTestId('map-screen').boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(389);
  expect(bounds!.height).toBeGreaterThan(450);
  for (const walk of [1, 2]) {
    await page.getByRole('tab', { name: 'Map', exact: true }).click();
    await page.getByRole('button', { name: 'Start walk', exact: true }).click();
    await expect(page.getByText('Recording walk', { exact: true }).first()).toBeVisible();
    // Wait for the second reading so the walk really has distance before it is paused.
    await expect(page.getByText(/^1\d m · /).first()).toBeVisible();
    await page.getByRole('button', { name: 'Pause walk', exact: true }).click();
    await page.getByRole('button', { name: 'Finish walk', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm finish', exact: true }).click();
    await page.getByRole('tab', { name: 'Activity', exact: true }).click();
    for (let n = 1; n <= walk; n++) await expect(page.getByRole('heading', { name: `Walk ${n}`, exact: true })).toBeVisible();
    await expect(page.getByText(/^Completed · /)).toHaveCount(walk);
  }
});

test('NAV-03: Activity retains the paused walk and totals when returning to Map', async ({ page }) => {
  await stubGps(page, 'walk');
  await register(page);
  await page.getByRole('button', { name: 'Start walk', exact: true }).click();
  await expect(page.getByText(/^1\d m · /).first()).toBeVisible();
  await page.getByRole('button', { name: 'Pause walk', exact: true }).click();
  // Read the totals only once the pause has rendered; before that a timer tick can still land.
  await expect(page.getByRole('button', { name: 'Resume walk', exact: true })).toBeVisible();
  const totals = await page.getByTestId('map-home').getByText(/^1\d m · /).innerText();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(page.getByText('Walk paused', { exact: true })).toBeVisible();
  await expect(page.getByText(totals)).toBeVisible();
  await page.getByRole('tab', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume walk', exact: true })).toBeVisible();
  await expect(page.getByTestId('map-home').getByText(totals, { exact: true })).toBeVisible();
});
