/**
 * Coast NPCs (same format as game/data/npcs.ts). Edit ONLY this file to change what they say or where they are.
 * Positions come from COAST_EXTRAS.spawns in game/frontend/world/frontend.ts ('npc-seagull', 'npc-shark').
 * {press} becomes "press E" on desktop and "tap A" on touch screens.
 */
import type { NpcDef } from '../../data/npcs';

export const COAST_NPCS: NpcDef[] = [
  // ---------------------------------------------------------------- Seagull: perched near the gallery door
  {
    id: 'gully',
    name: 'Gully',
    sheet: { key: 'npc-seagull', path: '/sprites/npc_seagull.png', frameWidth: 32, frameHeight: 32 },
    anim: {
      type: 'loop',
      frames: [
        { frame: 0, ms: 1500 }, { frame: 1, ms: 160 }, { frame: 0, ms: 900 },
        { frame: 2, ms: 260 }, { frame: 3, ms: 300 }, { frame: 2, ms: 260 }, { frame: 3, ms: 300 },
        { frame: 0, ms: 1100 }, { frame: 4, ms: 380 }, { frame: 5, ms: 260 },
      ],
    },
    portraitFrame: 0,
    spawn: { name: 'npc-seagull', fallback: { dx: -150, dy: 260 } },
    reach: 34,
    motion: { type: 'still', solid: { w: 12, h: 6 } },
    pages: [
      'SQUAWK! Welcome to the coast. I know everything that happens on this beach.',
      'See the big arched hall up the path? That is the ART GALLERY. Each painting on its walls is a website Sajad designed.',
      'Stand in front of a frame and {press} to open it. The halls loop forever, so keep walking: there is always another painting.',
      'And the red-and-white tower on the rocks? The LIGHTHOUSE. Inside, every floor shows a UI component he built.',
      'Climb to the top, find the binoculars and {press}. Best view on the coast. Now, got any chips?',
    ],
  },

  // ---------------------------------------------------------------- Shark: circling beside the dock
  {
    id: 'finn',
    name: 'Finn',
    sheet: { key: 'npc-shark', path: '/sprites/npc_shark.png', frameWidth: 48, frameHeight: 32 },
    anim: { type: 'loop', frames: [0, 1, 2, 3].map((frame) => ({ frame, ms: 170 })) },
    portraitFrame: 0,
    spawn: { name: 'npc-shark', fallback: { dx: -80, dy: 400 } },
    reach: 62,
    motion: { type: 'orbit', radius: 24, period: 8, clockwise: true },
    pages: [
      'Do not panic. The fin is only for style. I bite bad UI, never visitors.',
      'I circle this dock all day, so I see everyone heading to the LIGHTHOUSE: the tower out on the western rocks.',
      'Its door is at the foot of the tower. Climb the stairs and every floor shows a different component, running live.',
      'Prefer finished designs? The ART GALLERY in the big hall has full website designs, one per painting.',
      'Lighthouse for the parts, gallery for the whole picture. Now off you go, I have laps to finish.',
    ],
  },
];
