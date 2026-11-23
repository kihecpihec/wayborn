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
export const accounts =
  url && key
    ? createClient(url, key, {
        auth: {
          storage,
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
