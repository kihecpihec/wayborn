import { register, mailboxCode } from './accountFixture';
import { test, expect } from '@playwright/test';

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
  await expect(page.getByRole('tab',{name:'Map',exact:true})).toBeVisible();
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
