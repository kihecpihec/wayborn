import { test } from "node:test";
import assert from "node:assert/strict";
import { describeAuthError } from "./authErrors";

// Expected wording is written here, not derived from the implementation.
const cases: [unknown, RegExp][] = [
  [{ code: "invalid_credentials", message: "Invalid login credentials" }, /email or password is incorrect/i],
  [{ code: "email_not_confirmed", message: "Email not confirmed" }, /verify your email/i],
  [{ code: "otp_expired", message: "Token has expired or is invalid" }, /code .*(wrong|expired)/i],
  [{ code: "over_request_rate_limit", status: 429, message: "x" }, /too many attempts/i],
  [{ code: "over_email_send_rate_limit", status: 429, message: "x" }, /too many attempts/i],
  [{ code: "weak_password", message: "x" }, /stronger password/i],
  [{ code: "user_already_exists", message: "x" }, /already/i],
  [{ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" }, /can.t reach wayborn/i],
  [new TypeError("Failed to fetch"), /can.t reach wayborn/i],
  [{ status: 500, message: "boom" }, /something went wrong/i],
  [undefined, /something went wrong/i],
];

test("auth errors become actionable messages", () => {
  for (const [error, expected] of cases) assert.match(describeAuthError(error), expected);
});

test("raw server text and credentials never leak into messages", () => {
  const text = describeAuthError({ code: "unknown", message: "secret@example.test password=hunter2" });
  assert.doesNotMatch(text, /hunter2|secret@/);
});
