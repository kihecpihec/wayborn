export type Coordinate = { latitude: number; longitude: number };
export type Fix = Coordinate & { accuracy: number | null; timestamp: number };
export const PREVIEW: Coordinate = { latitude: 46.0514, longitude: 14.506 };
export function distance(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad;
  const lon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function parseCoordinate(
  latitude: string,
  longitude: string,
): Coordinate | null {
  if (!latitude.trim() || !longitude.trim()) return null;
  const lat = Number(latitude),
    lon = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
    ? { latitude: lat, longitude: lon }
    : null;
}
export function cellKey(point: Coordinate): string {
  // Approximately 40 m cells; longitude corrected for latitude.
  return `${Math.floor(point.latitude * 2783)}:${Math.floor(point.longitude * 2783 * Math.cos((point.latitude * Math.PI) / 180))}`;
}
