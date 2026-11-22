import { register, mailboxCode } from './accountFixture';
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
  await register(page);
  await expect(page.getByText('Ready to walk', { exact: true })).toBeVisible();
  for (const [title, description] of [['Activity','Permanent history'], ['Guild','Guild membership'], ['Goals','Daily and weekly goals']]) {
    await page.getByRole('tab', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(description + ' is not available yet'))).toBeVisible();
  }
  await page.getByRole('tab',{name:'Profile',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();
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
  await register(page);
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

test('AUTH-04: direct links require sign-in', async ({ page }) => {
  for (const path of ['/', '/activity', '/profile']) {
    await page.goto(path);
    await expect(page.getByRole('button', {name:'Sign in', exact:true})).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
  }
});

test('AUTH-01: verified account restores and sees only its own profile', async ({ page, browser }) => {
  const first = await register(page);
  await page.reload();
  await expect(page.getByTestId('map-screen')).toBeVisible();
  const second = await browser.newPage();
  try {
    await register(second);
    for (const current of [page,second]) {
      const session = await current.evaluate(() => {
        const key = Object.keys(localStorage).find(k=>k.endsWith('-auth-token'))!;
        return JSON.parse(localStorage.getItem(key)!);
      });
      const response = await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/profiles?select=id',{
        headers:{apikey:process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,Authorization:'Bearer '+session.access_token},
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([{id:session.user.id}]);
      if (current === page) expect(session.user.email).toBe(first.email);
    }
  } finally {await second.close();}
});
test('AUTH-03: recover account using emailed code', async ({ page }) => {
  const {email,password} = await register(page);
  await page.getByRole('tab',{name:'Profile'}).click();
  await page.getByRole('button',{name:'Sign out'}).click();
  await page.getByRole('button',{name:'Forgot password?'}).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button',{name:'Send reset code'}).click();
  await page.getByLabel('Email code').fill(await mailboxCode(email,'Reset your Wayborn password'));
  await page.getByLabel('Password',{exact:true}).fill(password+'new');
  await page.getByRole('button',{name:'Reset password'}).click();
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(/invalid/i);
  await page.getByLabel('Password',{exact:true}).fill(password+'new');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Map',exact:true})).toBeVisible();
});
