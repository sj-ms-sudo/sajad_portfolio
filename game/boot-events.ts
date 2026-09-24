/** Events the game emits on `game.events` so the React loading screen can follow along. */
export const BOOT = {
  /** payload: number 0..1 (overall asset load progress) */
  progress: 'boot:progress',
  /** the first scene finished create(); the loading screen can fade out */
  ready: 'boot:ready',
  /** payload: string key of the asset that failed to load */
  error: 'boot:error',
} as const;
