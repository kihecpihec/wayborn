import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { emptySpikeStats, type LocationSpikeStats } from "./locationSpikeTypes";

const task = "wayborn-location-feasibility-v1";
let database: SQLiteDatabase | undefined;
function store() {
  if (!database) {
    database = openDatabaseSync("location-feasibility.sqlite");
    database.execSync(`
      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        samples INTEGER NOT NULL DEFAULT 0,
        background INTEGER NOT NULL DEFAULT 0,
        errors INTEGER NOT NULL DEFAULT 0,
        lastFix INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO stats (id) VALUES (1);
    `);
  }
  return database;
}

if (process.env.EXPO_PUBLIC_LOCATION_SPIKE === "1") {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(task, async ({ data, error, executionInfo }) => {
    if (error) {
      store().runSync("UPDATE stats SET errors = errors + 1 WHERE id = 1");
      return;
    }
    const locations = data?.locations ?? [];
    const lastFix = locations.reduce((latest, fix) => Math.max(latest, fix.timestamp), 0);
    store().runSync(
      "UPDATE stats SET samples = samples + ?, background = background + ?, lastFix = MAX(lastFix, ?) WHERE id = 1",
      locations.length, executionInfo.appState === "background" ? locations.length : 0, lastFix,
    );
  });
}

export function readSpike(): LocationSpikeStats {
  return store().getFirstSync<LocationSpikeStats>("SELECT samples, background, errors, lastFix FROM stats WHERE id = 1") ?? emptySpikeStats;
}

export async function spikeRunning() {
  return Location.hasStartedLocationUpdatesAsync(task);
}

export async function startSpike() {
  if (process.env.EXPO_PUBLIC_LOCATION_SPIKE !== "1" || !await TaskManager.isAvailableAsync()) {
    throw new Error("Open the location-test development build.");
  }
  if (!(await Location.requestForegroundPermissionsAsync()).granted) {
    throw new Error("Allow foreground location to run the test.");
  }
  if (!(await Location.requestBackgroundPermissionsAsync()).granted) {
    throw new Error("Allow background location in Settings, then retry.");
  }
  if (await spikeRunning()) return;
  store().runSync("UPDATE stats SET samples = 0, background = 0, errors = 0, lastFix = 0 WHERE id = 1");
  await Location.startLocationUpdatesAsync(task, {
    accuracy: Location.Accuracy.High,
    timeInterval: 2000,
    distanceInterval: 3,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Wayborn location test",
      notificationBody: "Measuring location updates until you stop the test.",
    },
  });
}

export async function stopSpike() {
  if (await spikeRunning()) await Location.stopLocationUpdatesAsync(task);
}
