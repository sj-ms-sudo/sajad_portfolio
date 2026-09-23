# Sajad City — filetree (v0.0.6 state)

Next.js App Router project. No `src/` directory — `app/`, `components/`, `game/` live at
project root. `@/*` alias resolves to `./*`.

```
your-portfolio/
├── public/
│   ├── maps/
│   │   └── v0-sandbox.json
│   └── tilesets/
│       └── kernel-dusk-city-16.png
├── app/
│   └── sandbox/
│       └── page.tsx
├── components/
│   └── game/
│       ├── GameCanvas.tsx
│       └── GameMount.tsx
├── game/
│   ├── config.ts
│   └── scenes/
│       └── SandboxScene.ts
├── assets-src/
│   └── tiled/
│       ├── sajad-city-v0.tmx
│       ├── kernel-dusk-city-16.png
│       ├── gen_tileset.py
│       └── gen_map.py
├── tsconfig.json
└── package.json
```

## What each file is

| Path | Role |
|---|---|
| `public/maps/v0-sandbox.json` | Tiled JSON export. Loaded by Phaser at runtime via `/maps/v0-sandbox.json`. |
| `public/tilesets/kernel-dusk-city-16.png` | Tileset image, loaded separately from the JSON as a Phaser image asset. |
| `app/sandbox/page.tsx` | Route that mounts the game. |
| `components/game/GameMount.tsx` | `next/dynamic` + `ssr: false` boundary. Server Component safe. |
| `components/game/GameCanvas.tsx` | Client component. Dynamically imports `phaser` and `game/config` inside `useEffect`, owns the `Phaser.Game` instance lifecycle. |
| `game/config.ts` | `createGameConfig()` — canvas size, zoom, pixelArt/roundPixels, scene list. |
| `game/scenes/SandboxScene.ts` | Single Phaser scene: preload + create for the tilemap. Source of truth for map contract constants (`MAP` object). |
| `assets-src/tiled/sajad-city-v0.tmx` | Tiled source file (not served). Re-export to `public/maps/v0-sandbox.json` after edits. |
| `assets-src/tiled/gen_tileset.py`, `gen_map.py` | Scripts that generated the placeholder tileset/map programmatically. Reference only, not part of the build. |

## Not yet built (future versions)

- `game/scenes/` — additional scenes for V1 hub, V3 NPC/dialogue, etc.
- Object layer in Tiled for NPC spawn points / interaction zones (V3)
- Collision layer population (v0.3) — currently exists, empty
- Player sprite / movement controller (not in v0.0.6 scope)