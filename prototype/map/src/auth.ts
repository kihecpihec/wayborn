import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const storage =
  Platform.OS === "web"
    ? undefined
    : {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
      };
// Supabase's own default key, named explicitly so the saved session can be read below.
const storageKey = url
  ? `sb-${new URL(url).hostname.split(".")[0]}-auth-token`
  : "";
export const accounts =
  url && key
    ? createClient(url, key, {
        auth: {
          storage,
          storageKey,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export async function resetPassword(
  email: string,
  token: string,
  password: string,
) {
  if (!url || !key) throw new Error("Accounts are unavailable.");
  const recovery = createClient(url, key, {
    auth: {
      storageKey: "wayborn-recovery",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const verification = await recovery.auth.verifyOtp({
    type: "recovery",
    email,
    token,
  });
  if (verification.error) throw verification.error;
  try {
    const result = await recovery.auth.updateUser({ password });
    if (result.error) throw result.error;
  } finally {
    await recovery.auth.signOut({ scope: "local" });
  }
}

// A sign-out the player asked for. Any other end of the session is an expiry or revocation.
let requestedSignOut = false;
export function takeRequestedSignOut() {
  const requested = requestedSignOut;
  requestedSignOut = false;
  return requested;
}
export async function signOutOnRequest() {
  requestedSignOut = true;
  try {
    const result = await accounts?.auth.signOut({ scope: "local" });
    if (result?.error) throw result.error;
  } catch (error) {
    requestedSignOut = false;
    throw error;
  }
}

/**
 * The account whose session Supabase saved on this device. Supabase only reports a
 * saved session after refreshing an expired token over the network, so startup uses
 * this to open that account's map and local walks without waiting. It is never a
 * typed or submitted ID, and the server still authenticates every request itself.
 */
export async function savedAccountId(): Promise<string | null> {
  if (!accounts) return null;
  try {
    const raw =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(storageKey)
        : await SecureStore.getItemAsync(storageKey);
    const saved = raw ? JSON.parse(raw) : null;
    return typeof saved?.user?.id === "string" &&
      typeof saved.refresh_token === "string"
      ? saved.user.id
      : null;
  } catch {
    return null;
  }
}
