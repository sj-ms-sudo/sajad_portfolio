/**
 * Districts that live on their own Next route (each page runs its own Phaser game).
 * An exit whose `target` is a key here leaves the page: the scene fades out, emits
 * NAVIGATION.leaveDistrict, and the React canvas does router.push(districtUrl(target, spawn)).
 * The page we land on reads ?spawn=... once (consumeSpawnParam) and starts the player there.
 */
export const DISTRICT_ROUTES: Record<string, string> = {
  general: '/general',
  frontend: '/frontend',
};

/** Only exits with these NAMES leave the page. Every other exit keeps its old behaviour (a console note). */
export const PAGE_EXITS = new Set<string>(['to-frontend-east', 'to-general-west']);
export const isPageExit = (name: string): boolean => PAGE_EXITS.has(name);

const SPAWN_PARAM = 'spawn';

export function routeFor(target: string): string | undefined {
  return DISTRICT_ROUTES[target];
}

export function districtUrl(target: string, spawn: string): string | undefined {
  const path = routeFor(target);
  return path ? `${path}?${SPAWN_PARAM}=${encodeURIComponent(spawn)}` : undefined;
}

/** Reads ?spawn=... and strips it from the address bar, so a refresh starts at the default spot again. */
export function consumeSpawnParam(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const url = new URL(window.location.href);
  const spawn = url.searchParams.get(SPAWN_PARAM) ?? undefined;
  if (spawn) {
    url.searchParams.delete(SPAWN_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
  return spawn;
}
