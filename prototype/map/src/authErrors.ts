type AuthFailure = { code?: string; status?: number; name?: string; message?: string };

const again = " Please try again.";

/** Player-facing text for a sign-in problem. Server text is never shown, so it cannot echo credentials. */
export function describeAuthError(error: unknown): string {
  const failure = (typeof error === "object" && error !== null ? error : {}) as AuthFailure;
  if (error instanceof TypeError || failure.name === "AuthRetryableFetchError")
    return "Can't reach Wayborn. Check your connection and try again. Walks saved on this device are kept.";
  switch (failure.code) {
    case "invalid_credentials":
      return "The email or password is incorrect.";
    case "email_not_confirmed":
      return "Verify your email first. Use the code we sent you.";
    case "otp_expired":
    case "otp_disabled":
      return "That code is wrong or expired. Request a new one." ;
    case "weak_password":
      return "Choose a stronger password." + again;
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
  }
  if (failure.status === 429) return "Too many attempts. Wait a few minutes and try again.";
  return "Something went wrong." + again;
}
