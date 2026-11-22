import { test, expect } from '@playwright/test';
test('NAV-03: browse all destinations without starting GPS or gameplay', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { value: {
      watchPosition() { throw new Error('Unexpected GPS request while browsing'); },
      getCurrentPosition() { throw new Error('Unexpected GPS request while browsing'); },
    } });
  });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('Ready to walk', { exact: true })).toBeVisible();
  for (const [title, description] of [['Activity','Permanent history'], ['Guild','Guild membership'], ['Goals','Daily and weekly goals'], ['Profile','Account sign-in and permanent progress']]) {
    await page.getByRole('tab', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(description + ' is not available yet'))).toBeVisible();
  }
  await page.getByRole('tab', { name: 'Map', exact: true }).click();
  await expect(page.getByText('Ready to walk', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start walk', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'End walk', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});


test('NAV-04: full map and completed walk in session Activity', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { value: {
      watchPosition(success: (p: unknown) => void) {
        setTimeout(() => success({ timestamp: Date.now(), coords: { latitude: 46, longitude: 14, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null } }), 50);
        return 1;
      }, clearWatch() {},
    } });
  });
  await page.goto('/');
  const map = page.getByTestId('map-screen');
  await expect(map).toBeVisible();
  const bounds = await map.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(389);
  expect(bounds!.height).toBeGreaterThan(700);
  await page.getByRole('button', { name: 'Start walk', exact: true }).click();
  await expect(page.getByText('Walk active', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'End walk', exact: true }).click();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Walk 1', exact: true })).toBeVisible();
  await expect(page.getByText('Completed · session-only demo', { exact: true })).toHaveCount(1);
  await page.getByRole('tab', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'Start walk', exact: true }).click();
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Walk 1', exact: true })).toBeVisible();
});
