import { useFonts } from "expo-font";
import React, { useEffect, useState } from "react";
import {
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaView } from "react-native-safe-area-context";
import { accounts, resetPassword } from "./auth";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";
const titles = {
  login: "Welcome back",
  register: "Create your account",
  verify: "Check your email",
  forgot: "Forgot your password?",
  reset: "Choose a new password",
};
const actions = {
  login: "Sign in",
  register: "Create account",
  verify: "Verify email",
  forgot: "Send reset code",
  reset: "Reset password",
};

export function AccountGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!accounts);
  useEffect(() => {
    if (!accounts) return;
    const { data } = accounts.auth.onAuthStateChange((_event, value) => {
      setSession(value);
      setReady(true);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") accounts?.auth.startAutoRefresh();
      else accounts?.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      subscription.remove();
    };
  }, []);
  if (session)
    return <React.Fragment key={session.user.id}>{children}</React.Fragment>;
  return <AccountEntry ready={ready} />;
}

function AccountEntry({ ready }: { ready: boolean }) {
  const [fontsReady] = useFonts({
    PixelifySans: require("../assets/fonts/PixelifySans.ttf"),
  });
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function change(next: Mode) {
    setMode(next);
    setMessage("");
    setCode("");
    setPassword("");
  }
  async function submit() {
    if (!accounts || busy) return;
    setBusy(true);
    setMessage("");
    const address = email.trim();
    try {
      const auth = accounts.auth;
      if (mode === "reset") {
        await resetPassword(address, code.trim(), password);
        change("login");
        setMessage("Password updated. Sign in with your new password.");
      } else if (mode === "forgot") {
        const { error } = await auth.resetPasswordForEmail(address);
        if (error) throw error;
        change("reset");
      } else if (mode === "verify") {
        const { error } = await auth.verifyOtp({
          email: address,
          token: code.trim(),
          type: "signup",
        });
        if (error) throw error;
      } else {
        const result =
          mode === "register"
            ? await auth.signUp({ email: address, password })
            : await auth.signInWithPassword({ email: address, password });
        if (result.error) throw result.error;
        if (!result.data.session) change("verify");
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const hasCode = mode === "verify" || mode === "reset";
  return (
    <View style={s.page}>
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        <View style={{ flexDirection: "row" }}>
          {[
            24, 32, 24, 16, 8, 16, 24, 32, 24, 16, 8, 16, 24, 16, 8, 16, 24, 32,
            24, 16,
          ].map((height, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: height + 24,
                backgroundColor: "#f3f4ee",
                borderBottomWidth: 8,
                borderBottomColor: "#bbcee4",
              }}
            />
          ))}
        </View>
        {[
          [6, 20],
          [88, 16],
          [15, 75],
          [92, 64],
          [6, 48],
          [81, 88],
          [23, 10],
          [95, 38],
        ].map(([x, y], i) => (
          <View
            key={x + ":" + y}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: 12,
              height: 12,
              opacity: i % 2 ? 0.65 : 0.35,
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 4,
                width: 4,
                height: 12,
                backgroundColor: "#98bbee",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 4,
                height: 4,
                width: 12,
                backgroundColor: "#98bbee",
              }}
            />
          </View>
        ))}
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scroll}
          >
            <View style={s.card}>
              <View style={s.wordmark}>
                <Image
                  source={require("../assets/wayborn-icon.png")}
                  style={{ width: 76, height: 76, borderRadius: 16 }}
                />
                <Text style={s.brand}>wayborn</Text>
              </View>
              <View style={s.form}>
                <Text
                  accessibilityRole="header"
                  style={[
                    s.title,
                    fontsReady && {
                      fontFamily: "PixelifySans",
                      fontWeight: "normal",
                    },
                  ]}
                >
                  {titles[mode]}
                </Text>
                <Text style={s.label}>Email address</Text>
                <TextInput
                  accessibilityLabel="Email address"
                  editable={!busy && !hasCode}
                  style={s.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                {hasCode && (
                  <>
                    <Text style={s.label}>Code from your email</Text>
                    <TextInput
                      accessibilityLabel="Email code"
                      style={s.input}
                      value={code}
                      keyboardType="number-pad"
                      onChangeText={setCode}
                    />
                  </>
                )}
                {mode !== "verify" && mode !== "forgot" && (
                  <>
                    <Text style={s.label}>
                      {mode === "reset" ? "New password" : "Password"}
                    </Text>
                    <TextInput
                      accessibilityLabel="Password"
                      style={s.input}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </>
                )}
                {!!message && (
                  <Text style={s.label} accessibilityRole="alert">
                    {message}
                  </Text>
                )}
                {!accounts && (
                  <Text style={s.label}>
                    Accounts are unavailable in this build.
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={!accounts || busy || !ready}
                  style={s.button}
                  onPress={submit}
                >
                  <Text style={s.action}>
                    {!ready || busy ? "Please wait…" : actions[mode]}
                  </Text>
                </Pressable>
                {(mode === "login"
                  ? [
                      ["register", "Create an account"],
                      ["forgot", "Forgot password?"],
                    ]
                  : [["login", "Back to sign in"]]
                ).map(([target, label]) => (
                  <Pressable
                    accessibilityRole="button"
                    key={target}
                    disabled={busy}
                    style={s.link}
                    onPress={() => change(target as Mode)}
                  >
                    <Text style={s.linkText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#13213a" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 26,
    paddingTop: 68,
    paddingBottom: 28,
  },
  card: { width: "100%", maxWidth: 392 },
  wordmark: { alignItems: "center", gap: 8, marginBottom: 22 },
  brand: {
    color: "#adc7eb",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  form: { gap: 8 },
  title: {
    color: "#f2f6ff",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 31,
    fontWeight: "900",
    marginBottom: 18,
  },
  label: { color: "#dbe6f6", fontSize: 15, fontWeight: "600" },
  input: {
    backgroundColor: "#fffefa",
    color: "#13213a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 50,
    fontSize: 17,
    marginBottom: 5,
  },
  button: {
    marginTop: 8,
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffcd44",
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: "#091324",
  },
  action: { color: "#13213a", fontWeight: "900", fontSize: 18 },
  link: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  linkText: { color: "#bcd2f2", fontWeight: "700", fontSize: 16 },
});
