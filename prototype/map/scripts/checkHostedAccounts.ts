import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Explicit manual check: creates two synthetic accounts and removes only those IDs.
// CLI credentials, passwords and sessions remain in process memory and are never logged.
async function main() {
  if (
    process.argv[2] !== "--run-hosted" ||
    !/^[a-z]{20}$/.test(process.argv[3] ?? "")
  ) {
    throw new Error(
      "Usage: tsx scripts/checkHostedAccounts.ts --run-hosted <project-ref>",
    );
  }
  const project = process.argv[3];
  let keys: { name: string; api_key: string }[];
  try {
    keys = JSON.parse(
      execFileSync(
        "npx",
        [
          "--yes",
          "supabase@2.122.1",
          "projects",
          "api-keys",
          "--project-ref",
          project,
          "--reveal",
          "--output",
          "json",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
  } catch {
    throw new Error("Unable to read hosted keys through the authenticated CLI");
  }
  const service = keys.find((k) => k.name === "service_role")?.api_key;
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  assert.ok(service && anon, "Expected project keys are unavailable");
  const url = `https://${project}.supabase.co`;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, service, options);
  const ids: string[] = [];
  try {
    const clients: SupabaseClient[] = [];
    for (let i = 0; i < 2; i++) {
      const email = `wayborn-hosted-${randomUUID()}@example.test`;
      const password = randomUUID();
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.equal(created.error, null, "Synthetic account creation failed");
      const id = created.data.user!.id;
      ids.push(id);
      const client: SupabaseClient = createClient(url, anon, options);
      assert.equal(
        (await client.auth.signInWithPassword({ email, password })).error,
        null,
        "Synthetic login failed",
      );
      const profile = await client.from("profiles").select("id");
      assert.equal(profile.error, null, "Profile query failed");
      assert.deepEqual(
        profile.data,
        [{ id }],
        "A signed-in user must see only their own profile",
      );
      clients.push(client);
    }
    for (let i = 0; i < 2; i++) {
      const other = ids[1 - i];
      const hidden = await clients[i]
        .from("profiles")
        .select("id")
        .eq("id", other);
      assert.equal(hidden.error, null);
      assert.deepEqual(hidden.data, [], "Another profile must be hidden");
      assert.ok(
        (await clients[i].from("profiles").insert({ id: other })).error,
        "Client profile insertion must be denied",
      );
      assert.ok(
        (await clients[i].from("profiles").delete().eq("id", other)).error,
        "Client profile deletion must be denied",
      );
    }
    assert.ok(
      (await createClient(url, anon, options).from("profiles").select("id"))
        .error,
      "Anonymous profile access must be denied",
    );
    console.log(
      "Hosted checks passed: profile trigger, two real sessions, account isolation, anonymous denial and client-write denial.",
    );
  } finally {
    let cleanupFailed = false;
    for (const id of ids) {
      const removed = await admin.auth.admin.deleteUser(id);
      if (removed.error) {
        console.error(
          "Synthetic auth cleanup failed:",
          removed.error.code ?? removed.error.status,
        );
        cleanupFailed = true;
      }
    }
    // service_role has no SELECT grant on this intentionally private table. Check
    // cascade cleanup through the linked database, not by weakening its privileges.
    if (ids.length) {
      assert.ok(ids.every((id) => /^[0-9a-f-]{36}$/i.test(id)));
      const query = `select count(*)::int as remaining from public.profiles where id in (${ids.map((id) => `'${id}'`).join(",")})`;
      const result = JSON.parse(
        execFileSync(
          "npx",
          [
            "--yes",
            "supabase@2.122.1",
            "db",
            "query",
            "--linked",
            "--project-ref",
            project,
            "--output",
            "json",
            query,
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        ),
      );
      if (result.rows?.[0]?.remaining !== 0) cleanupFailed = true;
    }
    if (cleanupFailed)
      throw new Error(
        "Synthetic account cleanup needs attention in the hosted dashboard",
      );
    console.log(
      `Cleanup verified for ${ids.length} synthetic accounts and profiles.`,
    );
  }
}
void main().catch(() => {
  console.error(
    "Hosted account verification failed. Inspect profile/RLS configuration; no credentials were logged.",
  );
  process.exitCode = 1;
});
