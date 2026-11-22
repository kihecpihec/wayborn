import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.EXPO_PUBLIC_LOCATION_SPIKE !== "1") return config as ExpoConfig;
  return {
    ...config,
    name: "Wayborn Location Test",
    slug: config.slug!,
    scheme: "wayborn-location-test",
    ios: { ...config.ios, bundleIdentifier: "com.wayborn.locationtest" },
    android: { ...config.android, package: "com.wayborn.locationtest" },
    plugins: (config.plugins ?? []).map((plugin) =>
      Array.isArray(plugin) && plugin[0] === "expo-location"
        ? ["expo-location", {
          ...plugin[1],
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
          locationAlwaysAndWhenInUsePermission: "Allow Wayborn Location Test to measure location updates while the screen is locked.",
        }]
        : plugin,
    ),
  };
};
