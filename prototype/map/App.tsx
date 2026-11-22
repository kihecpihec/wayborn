import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
} from "@expo-google-fonts/nunito";
import MapView from "./src/MapView";
import { parseCoordinate } from "./src/geo";
import { useWalkSession } from "./src/WalkProvider";

// One warm-neutral ramp around the logo's navy ink. Gold is the only accent;
// mint appears only as a live-GPS dot.
const C = {
  ink: "#141c30",
  secondary: "#444d60",
  muted: "#636b7d",
  gold: "#ffcc43",
  green: "#69d7a0",
  paper: "#f4f2ec",
  surface: "#fcfbf8",
  line: "rgba(20,28,48,0.1)",
  fill: "rgba(20,28,48,0.06)",
  error: "#a53325",
};
const TABULAR = ["tabular-nums" as const];

function Button({
  label,
  onPress,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        compact && { height: 40 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
function PauseIcon() {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      <View style={s.pauseBar} />
      <View style={s.pauseBar} />
    </View>
  );
}
function PlayIcon() {
  return (
    <View
      style={{
        marginLeft: 2,
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderLeftWidth: 12,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: "white",
      }}
    />
  );
}
function TargetIcon() {
  return (
    <View style={s.targetRing}>
      <View style={s.targetDot} />
    </View>
  );
}
function SignalIcon() {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {[4, 6, 8, 12].map((h) => (
        <View key={h} style={[s.signalBar, { height: h }]} />
      ))}
    </View>
  );
}
function BatteryIcon() {
  return (
    <View style={s.battery}>
      <View style={s.batteryFill} />
    </View>
  );
}
export function Demo() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = Platform.OS === "web" && width >= 1200;
  const framed = Platform.OS === "web" && width >= 600;
  const { walk, fix, status, source, spoof, enableGPS, dispatch } = useWalkSession();
  const [latitude, setLatitude] = useState("46.0514");
  const [longitude, setLongitude] = useState("14.5060");
  const [error, setError] = useState("");
  const [recenter, setRecenter] = useState(0);
  const [pixel, setPixel] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const minutes = Math.floor(walk.elapsed / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(walk.elapsed % 60)
    .toString()
    .padStart(2, "0");
  const xp = walk.cells.length * 25;
  const level = Math.floor(xp / 500) + 1;
  const progress = (xp % 500) / 500;
  const apply = () => {
    const coordinate = parseCoordinate(latitude, longitude);
    if (!coordinate) {
      setError("Enter latitude −90 to 90 and longitude −180 to 180.");
      return;
    }
    setError("");
    spoof(coordinate);
    setRecenter((value) => value + 1);
  };
  const developer = (
    <View style={s.devCard}>
      <View style={s.row}>
        <Text style={s.devTitle}>Developer tools</Text>
        <Text style={s.meta}>Local only</Text>
      </View>
      <Text style={s.body}>
        Place your explorer anywhere in the world. The map follows coordinates,
        just as it follows your GPS.
      </Text>
      <View style={s.modeRow}>
        <View
          style={[
            s.dot,
            { backgroundColor: source === "gps" ? C.green : C.gold },
          ]}
        />
        <Text style={s.modeText}>
          {source === "gps" ? "Device GPS" : "Spoofed location"}
        </Text>
      </View>
      <Text style={s.fieldLabel}>Latitude</Text>
      <TextInput
        accessibilityLabel="Latitude"
        value={latitude}
        onChangeText={setLatitude}
        style={s.input}
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
      />
      <Text style={s.fieldLabel}>Longitude</Text>
      <TextInput
        accessibilityLabel="Longitude"
        value={longitude}
        onChangeText={setLongitude}
        style={s.input}
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <View style={s.presetRow}>
        {[
          ["Ljubljana", "46.0514", "14.5060"],
          ["London", "51.5074", "-0.1278"],
          ["Tokyo", "35.6812", "139.7671"],
        ].map(([name, lat, lon]) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            onPress={() => {
              setLatitude(lat);
              setLongitude(lon);
            }}
            style={s.preset}
          >
            <Text style={s.presetText}>{name}</Text>
          </Pressable>
        ))}
      </View>
      <Button label="Apply location" onPress={apply} compact />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          enableGPS();
          setRecenter((value) => value + 1);
        }}
        style={s.textButton}
      >
        <Text style={s.link}>Use device GPS / retry</Text>
      </Pressable>
      <View style={s.divider} />
      <Text style={s.note}>No joystick, no pretend movement</Text>
      <Text style={s.bodySmall}>
        Walk outside with GPS enabled, or feed a route through your simulator’s
        location controls. Dragging the map only changes the camera.
      </Text>
      <Text style={s.footnote}>
        Applying coordinates or switching sources starts a new walk. Progress is
        stored for this session only.
      </Text>
    </View>
  );
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={[s.pageContent, !framed && { padding: 0 }]}
    >
      {framed && (
        <View style={s.header}>
          <View style={s.brand}>
            <Image
              source={require("./assets/wayborn-icon.png")}
              style={{ width: 32, height: 36 }}
              resizeMode="contain"
            />
            <Text style={s.brandText}>wayborn</Text>
            {width >= 1100 && (
              <>
                <View style={s.headerDivider} />
                <Text style={s.headerNote}>Your world, your adventure</Text>
              </>
            )}
          </View>
          <Text style={s.meta}>Demo 01</Text>
        </View>
      )}
      <View
        style={[
          s.main,
          !desktop && { flexDirection: "column", alignItems: "center" },
          !framed && { paddingVertical: 0, gap: 0 },
        ]}
      >
        {desktop && (
          <View style={s.intro}>
            <Text style={s.headline}>
              Explore your streets on foot, one new place at a time
            </Text>
            <Text style={s.introBody}>
              Wayborn draws the real streets around you as pixel art. It counts
              distance, steps and every new place you reach.
            </Text>
            <View style={s.facts}>
              {[
                ["Location", "Device GPS, or coordinates you enter"],
                ["Map", "OpenStreetMap streets, drawn as pixel art"],
                ["Progress", "25 XP for every new place, 500 XP a level"],
              ].map(([label, text]) => (
                <View key={label} style={s.fact}>
                  <Text style={s.factLabel}>{label}</Text>
                  <Text style={s.factText}>{text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <View
          style={[
            s.phone,
            framed
              ? s.phoneFrame
              : {
                  width: "100%",
                  height: Math.max(740, height),
                  borderRadius: 0,
                  padding: 0,
                },
          ]}
        >
          <View
            style={[
              s.screen,
              !framed && { borderRadius: 0, paddingTop: insets.top },
            ]}
          >
            {framed && (
              <View style={s.statusbar}>
                <Text style={s.time}>9:41</Text>
                <View style={s.island} />
                <View style={s.statusIcons}>
                  <SignalIcon />
                  <BatteryIcon />
                </View>
              </View>
            )}
            <View style={s.mapArea}>
              <MapView
                point={fix}
                path={walk.path}
                recenter={recenter}
                pixel={pixel}
              />
              <View style={s.topOverlay} pointerEvents="box-none">
                <View style={s.hud}>
                  <Stat
                    value={`${(walk.meters / 1000).toFixed(2)}`}
                    label="km walked"
                  />
                  <Stat value={`${minutes}:${seconds}`} label="walk time" />
                  <Stat
                    value={Math.floor(walk.meters / 0.75).toLocaleString()}
                    label="est. steps"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      walk.ended
                        ? "Start new walk"
                        : !walk.started
                          ? "Start walk"
                        : walk.running
                          ? "Pause walk"
                          : "Resume walk"
                    }
                    onPress={() =>
                      dispatch({ type: walk.ended ? "reset" : !walk.started ? "start" : "pause" })
                    }
                    style={({ pressed }) => [
                      s.pause,
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    {walk.running ? <PauseIcon /> : <PlayIcon />}
                  </Pressable>
                </View>
              </View>
              <View style={s.mapBottom}>
                <View style={s.locationChip}>
                  <Text numberOfLines={1} style={s.locationText}>
                    {fix
                      ? `${fix.latitude.toFixed(4)}°, ${fix.longitude.toFixed(4)}°`
                      : "Ljubljana preview"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Pixel world map"
                  accessibilityState={{ checked: pixel }}
                  onPress={() => setPixel((value) => !value)}
                  style={[s.mapControl, pixel && s.mapControlOn]}
                >
                  <Text style={s.pixelToggleText}>
                    {pixel ? "Pixel" : "Map"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Recenter map on user"
                  onPress={() => setRecenter((value) => value + 1)}
                  style={[s.mapControl, s.mapControlSquare]}
                >
                  <TargetIcon />
                </Pressable>
              </View>
            </View>
            <View
              style={[
                s.sheet,
                { paddingBottom: framed ? 8 : Math.max(16, insets.bottom) },
              ]}
            >
              <View style={s.handle} />
              <Text style={s.sheetTitle}>
                {walk.ended
                  ? "Walk finished"
                  : !walk.started
                    ? "Ready to walk"
                  : walk.running
                    ? "Today’s walk"
                    : "Walk paused"}
              </Text>
              <Text style={s.explored}>
                <Text style={s.bold}>
                  {walk.cells.length}{" "}
                  {walk.cells.length === 1 ? "place" : "places"} explored
                </Text>
                {"  ·  25 XP per place"}
              </Text>
              <View style={s.levelRow}>
                <View style={s.levelBadge}>
                  <Text style={s.levelNumber}>{level}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.row}>
                    <Text style={s.levelLabel}>Level {level}</Text>
                    <Text style={s.xp}>{xp % 500} / 500 XP</Text>
                  </View>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 500, now: xp % 500 }}
                    style={s.cells}
                  >
                    {Array.from({ length: 20 }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          s.cell,
                          i < Math.ceil(progress * 20) && {
                            backgroundColor: C.gold,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Button
                label={walk.ended ? "Start new walk" : !walk.started ? "Start walk" : "End walk"}
                onPress={() => dispatch({ type: walk.ended ? "reset" : !walk.started ? "start" : "end" })}
              />
              {status ? (
                <Text numberOfLines={2} style={s.gpsStatus}>
                  {status}
                </Text>
              ) : null}
              {!framed && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDevOpen((v) => !v)}
                  style={{ alignSelf: "center", padding: 8 }}
                >
                  <Text style={s.link}>
                    {devOpen ? "Close developer tools" : "Open developer tools"}
                  </Text>
                </Pressable>
              )}
              {framed && <View style={s.homeIndicator} />}
            </View>
          </View>
        </View>
        {(framed || devOpen) && (
          <View
            style={[
              s.devWrap,
              !desktop && { width: Math.min(width - 32, 420), marginTop: 32 },
            ]}
          >
            {developer}
            <View style={s.mapNote}>
              <Text style={s.mapNoteTitle}>Map data</Text>
              <Text style={s.bodySmall}>
                OpenStreetMap and OpenFreeMap beneath your feet. The HUD is a
                prototype; your map and location are real.
              </Text>
            </View>
          </View>
        )}
      </View>
      {framed && (
        <View style={s.footer}>
          <Text style={s.meta}>React Native and OpenStreetMap</Text>
        </View>
      )}
    </ScrollView>
  );
}
export default function App() {
  const [loaded, error] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
  });
  if (!loaded && !error)
    return (
      <View
        style={{ flex: 1, justifyContent: "center", backgroundColor: C.paper }}
      >
        <ActivityIndicator color={C.ink} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Demo />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  pageContent: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 24,
    minHeight: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderColor: C.line,
    gap: 16,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 24,
    lineHeight: 32,
    color: C.ink,
  },
  headerDivider: {
    height: 16,
    width: 1,
    backgroundColor: C.line,
    marginHorizontal: 8,
  },
  headerNote: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: C.muted,
  },
  meta: {
    fontFamily: "Nunito_500Medium",
    fontSize: 12,
    color: C.muted,
    fontVariant: TABULAR,
  },
  main: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    paddingVertical: 32,
    flex: 1,
  },
  intro: { flex: 1, maxWidth: 360, flexShrink: 1 },
  headline: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: C.ink,
  },
  introBody: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: C.secondary,
    marginTop: 20,
    maxWidth: 320,
  },
  facts: {
    marginTop: 32,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  fact: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    gap: 16,
  },
  factLabel: {
    fontFamily: "Nunito_500Medium",
    fontSize: 12,
    lineHeight: 20,
    color: C.muted,
    width: 64,
  },
  factText: {
    fontFamily: "Nunito_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: C.ink,
    flex: 1,
  },
  phone: {
    width: 384,
    height: 792,
    backgroundColor: "#10151a",
    padding: 8,
    overflow: "hidden",
  },
  phoneFrame: {
    borderRadius: 48,
    boxShadow: "0 24px 48px rgba(20,28,48,0.16), 0 0 0 1px rgba(20,28,48,0.2)",
  },
  screen: {
    flex: 1,
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: C.surface,
  },
  statusbar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    backgroundColor: C.surface,
  },
  time: { fontFamily: "Nunito_600SemiBold", color: C.ink, fontSize: 15 },
  island: {
    backgroundColor: "#10151a",
    width: 104,
    height: 28,
    borderRadius: 14,
    position: "absolute",
    top: 8,
    left: 132,
  },
  statusIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  signalBar: { width: 3, borderRadius: 1, backgroundColor: C.ink },
  battery: {
    width: 24,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(20,28,48,0.4)",
    padding: 1,
  },
  batteryFill: {
    flex: 1,
    width: "75%",
    borderRadius: 2,
    backgroundColor: C.ink,
  },
  mapArea: { flex: 1, minHeight: 320 },
  topOverlay: { position: "absolute", top: 8, left: 12, right: 12 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    boxShadow: "0 4px 16px rgba(20,28,48,0.12)",
  },
  statValue: {
    color: C.ink,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "Nunito_600SemiBold",
    fontVariant: TABULAR,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: C.muted,
    fontFamily: "Nunito_400Regular",
  },
  pause: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBar: { width: 4, height: 16, borderRadius: 1, backgroundColor: "white" },
  mapBottom: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 40,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  locationChip: {
    height: 36,
    justifyContent: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexShrink: 1,
  },
  locationText: {
    fontFamily: "Nunito_500Medium",
    fontSize: 12,
    color: C.ink,
    fontVariant: TABULAR,
  },
  pixelToggleText: {
    fontFamily: "Nunito_500Medium",
    fontSize: 12,
    color: C.ink,
  },
  mapControl: {
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlOn: { backgroundColor: C.gold, borderColor: "rgba(20,28,48,0.2)" },
  mapControlSquare: { width: 36, paddingHorizontal: 0 },
  targetRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  targetDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.ink },
  sheet: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderColor: C.line,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    marginTop: -8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(20,28,48,0.14)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: C.ink,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 20,
    lineHeight: 24,
  },
  explored: {
    fontFamily: "Nunito_400Regular",
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    fontVariant: TABULAR,
  },
  bold: { fontFamily: "Nunito_500Medium", color: C.ink },
  levelRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginVertical: 16,
  },
  levelBadge: {
    height: 40,
    width: 40,
    backgroundColor: C.ink,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: {
    color: "white",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 18,
    fontVariant: TABULAR,
  },
  levelLabel: { fontFamily: "Nunito_500Medium", color: C.ink, fontSize: 14 },
  xp: {
    fontFamily: "Nunito_400Regular",
    color: C.muted,
    fontSize: 12,
    fontVariant: TABULAR,
  },
  cells: { flexDirection: "row", gap: 2, marginTop: 8 },
  cell: { flex: 1, height: 12, borderRadius: 2, backgroundColor: C.fill },
  button: {
    height: 48,
    backgroundColor: C.ink,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontFamily: "Nunito_500Medium",
    fontSize: 15,
  },
  gpsStatus: {
    color: C.muted,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 12,
  },
  homeIndicator: {
    width: 104,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.ink,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 4,
  },
  devWrap: { width: 304 },
  devCard: {
    borderWidth: 1,
    borderColor: C.line,
    padding: 24,
    borderRadius: 20,
    backgroundColor: C.surface,
  },
  devTitle: {
    fontFamily: "Nunito_600SemiBold",
    color: C.ink,
    fontSize: 20,
    lineHeight: 24,
  },
  body: {
    fontFamily: "Nunito_400Regular",
    color: C.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginVertical: 20,
  },
  modeText: { color: C.ink, fontSize: 12, fontFamily: "Nunito_500Medium" },
  fieldLabel: {
    fontFamily: "Nunito_500Medium",
    fontSize: 12,
    color: C.muted,
    marginBottom: 8,
  },
  input: {
    height: 40,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(20,28,48,0.16)",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: "Nunito_500Medium",
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
    fontVariant: TABULAR,
  },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  preset: {
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: C.fill,
    borderRadius: 8,
  },
  presetText: {
    color: C.secondary,
    fontFamily: "Nunito_500Medium",
    fontSize: 12,
  },
  textButton: { paddingTop: 16, alignItems: "center" },
  link: { color: C.secondary, fontFamily: "Nunito_500Medium", fontSize: 12 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 24 },
  note: {
    color: C.ink,
    fontFamily: "Nunito_500Medium",
    fontSize: 14,
    marginBottom: 8,
  },
  bodySmall: {
    fontFamily: "Nunito_400Regular",
    color: C.secondary,
    fontSize: 12,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: "Nunito_400Regular",
    color: C.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 16,
  },
  error: {
    color: C.error,
    fontFamily: "Nunito_500Medium",
    fontSize: 12,
    marginBottom: 12,
  },
  mapNote: { padding: 24 },
  mapNoteTitle: {
    fontFamily: "Nunito_500Medium",
    color: C.ink,
    fontSize: 14,
    marginBottom: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: C.line,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
