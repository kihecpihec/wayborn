import type { Page } from '@playwright/test';

// Browser GPS stub: each reading is 10 s and about 11 m after the previous one,
// so the walk logic accepts it as walking. Unexpected access can be made to throw,
// and 'deny' answers the permission probe the way a browser does when refused.
export async function stubGps(page: Page, behaviour: 'forbid' | 'walk' | 'deny') {
  await page.addInitScript((mode) => {
    let reading = 0;
    let watches = 0;
    Object.defineProperty(navigator, 'geolocation', { value: {
      watchPosition(success: (p: unknown) => void) {
        if (mode !== 'walk') throw new Error('Unexpected GPS watch: ' + mode);
        const send = () => {
          reading += 1;
          success({ timestamp: 1_000_000 + reading * 10_000, coords: { latitude: 46 + reading * 0.0001, longitude: 14, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null } });
        };
        setTimeout(send, 50);
        setTimeout(send, 150);
        // expo-location tags events with this id, so each watch needs its own.
        return ++watches;
      },
      getCurrentPosition(success: (p: unknown) => void, failure?: (e: unknown) => void) {
        if (mode === 'forbid') throw new Error('Unexpected GPS request while browsing');
        const probes = window as unknown as { gpsProbes?: number };
        probes.gpsProbes = (probes.gpsProbes ?? 0) + 1;
        if (mode === 'deny') {
          failure?.({ code: 1, PERMISSION_DENIED: 1, message: 'User denied Geolocation' });
          return;
        }
        // The browser permission probe: grants access without producing a walk fix.
        success({ timestamp: 1, coords: { latitude: 46, longitude: 14, accuracy: 5 } });
      },
      clearWatch() {},
    } });
  }, behaviour);
}

