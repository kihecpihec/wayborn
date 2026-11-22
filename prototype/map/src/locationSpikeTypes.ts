export type LocationSpikeStats = {
  samples: number;
  background: number;
  errors: number;
  lastFix: number;
};
export const emptySpikeStats: LocationSpikeStats = {
  samples: 0, background: 0, errors: 0, lastFix: 0,
};
