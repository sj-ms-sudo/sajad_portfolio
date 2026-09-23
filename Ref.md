# Sajad City —

## Project

Personal portfolio site, Next.js App Router, TypeScript, no `src/` — `app/`, `components/`,
`game/` at project root. `@/*` → `./*`. Design system: "Kernel Dusk" — dark void canvas,
ember orange `#ff6436` accent, sharp corners, zero shadows.

Portfolio is being converted from a standard site into an explorable pixel-art world using
Phaser 3/4, inspired by peteroravac.com, GTA-like without being a direct copy: WASD
movement, navbar clicks teleport to map locations, districts = portfolio sections. Split
into versions: V0 walking sandbox → V1 hub+one district → V2 full district map → V3
NPCs/dialogue → V4 mini interactions → V5 polish+mobile. Each version further split into
numbered engineering spikes (v0.0.1–v0.0.6+), each its own git milestone.

There is a second, separate planned project called "AI Microverse" (multi-agent NPC town
simulation) — not the same thing as this portfolio world. Don't conflate them.

## Phaser version

Project is on **Phaser 4**, not 3, despite earlier planning docs saying "Phaser 3."
`Tilemap.createLayer()` in v4 takes an optional 5th `gpu` boolean and returns
`TilemapLayer | TilemapGPULayer`. Without passing `gpu: true` you always get a
`TilemapLayer` at runtime, but TypeScript doesn't know that — narrow with
`instanceof Phaser.Tilemaps.TilemapLayer`, never cast with `as`. A `TilemapGPULayer` has no
Arcade physics body and can't be used for the collision layer.

## Map contract (v0.0.5 / v0.0.6)

- 20×15 tiles, 16×16 px tiles → 320×240 world px
- Tileset name inside Tiled JSON: `kernel-dusk-city-16` (embedded tileset, not external
  `.tsx` — external tilesets export as `{"source": "foo.tsx"}` which Phaser can't resolve)
- Layers: `ground` (populated), `collision` (exists, all zeros, populate in v0.3)
- Tileset image: 128×64 px, 8 cols × 4 rows, 32 tiles, GID = index + 1
- Canvas: internal resolution 320×240, `zoom: 3` → 960×720 rendered. `pixelArt: true`,
  `roundPixels: true`, `Scale.NONE` (not `FIT` — reintroduces fractional scaling)
- Source of truth for these numbers is the `MAP` const at the top of `SandboxScene.ts`

## Known failure modes already handled in code

- `addTilesetImage(nameInTiledJSON, loaderKey)` returns `null` silently on a name mismatch
  → blank canvas, no console output. `SandboxScene.ts` throws with the actual tileset names
  found in the file.
- `createLayer(layerName, ...)` returns `null` silently on a layer-name mismatch → same
  blank-canvas failure. Same throw-with-actual-names treatment.
- Phaser reads `window` at import time → must never be statically imported into anything
  server-rendered. `GameMount.tsx` (`next/dynamic`, `ssr: false`) + `GameCanvas.tsx`
  (dynamic import inside `useEffect`) is the SSR boundary. Don't collapse these into one
  file — `ssr: false` isn't allowed inside a Server Component.
- React 18 Strict Mode double-invokes effects in dev → `GameCanvas.tsx` guards the
  `Phaser.Game` instance with a ref and calls `destroy(true)` on cleanup. Removing the guard
  produces two stacked canvases.

## Confirmed working state

v0.0.6 (load Tiled map into Phaser scene, non-src layout) is verified rendering correctly
at `/sandbox` — tile alignment clean, no console errors, no 404s. Tag:
`v0.0.6-map-loaded-in-phaser`.

## Open / upcoming

- v0.3: populate `collision` layer in Tiled, call
  `collisionLayer.setCollisionByExclusion([-1, 0])`, likely also
  `collisionLayer.setVisible(false)` since populated collision tiles render visibly by
  default even though they're meant to be invisible physics-only tiles
- No player sprite or movement controller yet
- No object layer yet for NPC spawn points / interaction zones (needed for V3)
- Placeholder tileset/map art throughout — Kernel Dusk-palette but programmatically
  generated, not final
- V1 hub map will be much larger than 320×240 — zoom will need to drop and camera will need
  to follow the player, using the camera bounds already set in `SandboxScene.create()`