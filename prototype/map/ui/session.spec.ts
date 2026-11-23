import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { openSqlite } from '../acceptance/sqliteFixture';
import { migrateWalkStorage, walkStorage } from '../src/walkStorage';
import { register } from './accountFixture';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const admin = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

test('AUTH-02: wrong password is refused with a useful message', async ({ page }) => {
  const { email } = await register(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('The email or password is incorrect.');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('not-the-password');
});

test('AUTH-02: a deliberate sign-out is not reported as an expired session', async ({ page }) => {
  await register(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('AUTH-02: an expired session returns to sign-in and says so', async ({ page }) => {
  await page.clock.install();
  const { email, password } = await register(page);
  const session = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))!;
    return JSON.parse(localStorage.getItem(key)!);
  });
  // The server ends the session, then the access token runs out: refreshing must fail.
  expect((await admin().auth.admin.signOut(session.access_token, 'global')).error).toBeNull();
  await page.clock.fastForward('02:00:00');
  await expect(page.getByRole('alert')).toContainText('Your session expired');
  await expect(page.getByRole('alert')).toContainText('kept');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Map', exact: true })).toBeVisible();
});

test('AUTH-02: reopening with a revoked saved session returns to sign-in and says so', async ({ page }) => {
  const { email, password } = await register(page);
  const session = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))!;
    const saved = JSON.parse(localStorage.getItem(key)!);
    // The access token ran out while the app was closed, so reopening must refresh it.
    localStorage.setItem(key, JSON.stringify({ ...saved, expires_at: Math.floor(Date.now() / 1000) - 60 }));
    return saved;
  });
  expect((await admin().auth.admin.signOut(session.access_token, 'global')).error).toBeNull();
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Your session expired');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Map', exact: true })).toBeVisible();
});

test('AUTH-02: pending work survives an expired session and stays with its owner', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wayborn-auth02-'));
  const { sqlite, db } = openSqlite(join(dir, 'walks.sqlite'));
  const anon = () => createClient(url, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await migrateWalkStorage(db);
    const credentials = async () => {
      const email = `${crypto.randomUUID()}@example.test`;
      const created = await admin().auth.admin.createUser({ email, password: 'correct-horse-battery', email_confirm: true });
      expect(created.error).toBeNull();
      return { email, password: 'correct-horse-battery', id: created.data.user!.id };
    };
    const [a, b] = [await credentials(), await credentials()];
    const client = anon();
    const signedIn = await client.auth.signInWithPassword(a);
    expect(signedIn.error).toBeNull();
    // Identity comes from the authenticated session, not from anything the app typed.
    const owner = (await client.auth.getUser()).data.user!.id;
    expect(owner).toBe(a.id);
    const store = walkStorage(db, owner);
    await store.start('walk-1', 1000);
    await store.append('walk-1', { sequence: 0, segment: 0, latitude: 46, longitude: 14, accuracy: 5, timestamp: 1000 });
    expect(await store.finish('walk-1', 2000)).toBe(true);

    // The session is revoked: the old token can no longer refresh or read the profile.
    await admin().auth.admin.signOut(signedIn.data.session!.access_token, 'global');
    const refreshed = await client.auth.refreshSession();
    expect(refreshed.error).not.toBeNull();
    expect(refreshed.data.session).toBeNull();
    const wrong = await anon().auth.signInWithPassword({ email: a.email, password: 'wrong' });
    expect(wrong.error?.code).toBe('invalid_credentials');

    // Nothing was lost, another account cannot see it, and the owner resumes the same expedition.
    expect(await walkStorage(db, owner).pending()).toEqual([{ id: 'walk-1', finishedAt: 2000 }]);
    const second = anon();
    await second.auth.signInWithPassword(b);
    const other = (await second.auth.getUser()).data.user!.id;
    expect(other).not.toBe(owner);
    expect(await walkStorage(db, other).pending()).toEqual([]);
    const again = anon();
    await again.auth.signInWithPassword(a);
    expect(await walkStorage(db, (await again.auth.getUser()).data.user!.id).pending()).toEqual([{ id: 'walk-1', finishedAt: 2000 }]);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
