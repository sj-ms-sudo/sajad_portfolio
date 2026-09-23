/**
 * NPC content + behaviour. Edit ONLY this file to change what they say, where they stand or how they move.
 *
 * In dialogue text, {press} becomes "press E" on desktop and "tap A" on touch screens.
 */

export interface NpcSheet {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Where an NPC lives (feet position; for orbiting NPCs it is the CENTRE of their circle).
 * `name` is looked up in general-district.zones.json -> "spawns". If it isn't there yet, the NPC is placed
 * relative to the player's "start" spawn instead, so they always show up while you're testing.
 * To place one for real: add  "npc-meera": { "x": 1234, "y": 567 }  to "spawns" in the JSON.
 */
export interface NpcSpawn {
  name: string;
  fallback: { dx: number; dy: number };
}

export type NpcFacing = 'down' | 'up' | 'left' | 'right';

export type NpcAnim =
  /**
   * 4 rows in the sheet, in this order: down, up, left, right. Each row starts with `frames` walking frames.
   * If a row has extra frames after those, set `columns` (frames per row) and `stand` (index of the standing frame).
   */
  | { type: 'directional'; frames: number; frameRate: number; columns?: number; stand?: number }
  /** One row of frames played in a loop (art must face RIGHT if the NPC moves; it is flipped for the other way). */
  | { type: 'loop'; frames: { frame: number; ms: number }[] };

export type NpcMotion =
  /** Stands still and turns on the spot: faces each direction in `order` for `hold` seconds, then repeats. */
  | { type: 'look'; order: NpcFacing[]; hold: number; solid?: { w: number; h: number } }
  /** Stays put. `solid` makes the player unable to walk through (w x h box at the NPC's feet). */
  | { type: 'still'; solid?: { w: number; h: number } }
  /** Walks round a circle. */
  | {
      type: 'orbit';
      radius: number;              // px
      period: number;              // seconds per lap
      clockwise?: boolean;         // default true
      phase?: number;              // starting angle in radians
      /** NPCs sharing a clock stay in step, and all pause together while you talk to any of them. */
      clock?: string;
      /** Trail this many radians behind the clock (a chaser). `lagWobble` makes the gap breathe. */
      lag?: number;
      lagWobble?: number;
      /** Little bounce while running, in px. */
      hop?: number;
    };

export interface NpcDef {
  id: string;
  /** Shown on the prompt and as the dialogue name tag. */
  name: string;
  sheet: NpcSheet;
  anim: NpcAnim;
  /** Frame of the sheet shown as the portrait in the dialogue box. */
  portraitFrame: number;
  spawn: NpcSpawn;
  /** How close (px, feet to feet) the player must be to talk. */
  reach: number;
  motion: NpcMotion;
  pages: string[];
}

export const NPCS: NpcDef[] = [
  // ---------------------------------------------------------------- Kerala girl: stands in the park, looking around
  {
    id: 'meera',
    name: 'Meera',
    sheet: { key: 'npc-meera', path: '/sprites/npc_meera.png', frameWidth: 32, frameHeight: 48 },
    anim: { type: 'directional', frames: 4, frameRate: 6, columns: 5, stand: 4 },
    portraitFrame: 4,
    spawn: { name: 'npc-meera', fallback: { dx: 120, dy: -30 } },
    reach: 34,
    motion: { type: 'look', order: ['left', 'up', 'right', 'down'], hold: 1.8, solid: { w: 14, h: 8 } },
    pages: [
      'Namaskaram! Welcome to Sajad City.',
      'See those bouncing "!" bubbles? Those are quest markers. Walk up to one and {press} to open it.',
      "Each marker is a piece of Sajad's story: his work, projects and skills.",
      'You can chat with the rest of us too. Stand close and {press}. Every one of us has a tip!',
    ],
  },

  // ---------------------------------------------------------------- Orange cat: cleaning his paw
  {
    id: 'marmalade',
    name: 'Marmalade',
    sheet: { key: 'npc-cat', path: '/sprites/npc_cat.png', frameWidth: 32, frameHeight: 32 },
    anim: {
      type: 'loop',
      frames: [
        { frame: 0, ms: 1600 }, // sitting, looking around
        { frame: 1, ms: 220 },  // paw comes up
        { frame: 2, ms: 260 },  // lick
        { frame: 3, ms: 260 },  // lick (tongue out)
        { frame: 2, ms: 260 },
        { frame: 3, ms: 260 },
        { frame: 2, ms: 260 },
        { frame: 4, ms: 220 },  // paw goes down
        { frame: 5, ms: 350 },  // blink
      ],
    },
    portraitFrame: 0,
    spawn: { name: 'npc-marmalade', fallback: { dx: -110, dy: 20 } },
    reach: 30,
    motion: { type: 'still', solid: { w: 18, h: 8 } },
    pages: [
      '*licks paw* ...Mrrow. Oh. A visitor.',
      "Cyber security tip from a cat: never reuse a password. One leaked password can open every door you own.",
      'Use a password manager and switch on two-factor login. It is the easiest upgrade there is.',
      'And if a message rushes you to click something, that is usually the trap. Pause first.',
    ],
  },

  // ---------------------------------------------------------------- Mouse: chasing the bug in circles
  {
    id: 'byte',
    name: 'Byte',
    sheet: { key: 'npc-mouse', path: '/sprites/npc_mouse.png', frameWidth: 16, frameHeight: 16 },
    anim: { type: 'loop', frames: [0, 1, 2, 3].map((frame) => ({ frame, ms: 85 })) },
    portraitFrame: 0,
    spawn: { name: 'npc-chase', fallback: { dx: 0, dy: 130 } },
    reach: 30,
    motion: { type: 'orbit', radius: 30, period: 3.6, clock: 'chase', lag: 0.95, lagWobble: 0.25, hop: 1.5 },
    pages: [
      'Squeak! Shh. I am hunting a bug.',
      "Debugging tip: make the bug happen on purpose first. If you can't reproduce it, you can't know you fixed it.",
      'Then read the error message properly. It usually tells you exactly where to look.',
      'And change one thing at a time. Otherwise you never learn which change worked.',
      'Now excuse me... GET BACK HERE!',
    ],
  },

  // ---------------------------------------------------------------- The bug: a feature, not a bug
  {
    id: 'glitch',
    name: 'Glitch',
    sheet: { key: 'npc-bug', path: '/sprites/npc_bug.png', frameWidth: 16, frameHeight: 16 },
    anim: { type: 'loop', frames: [0, 1, 2, 3].map((frame) => ({ frame, ms: 110 })) },
    portraitFrame: 0,
    spawn: { name: 'npc-chase', fallback: { dx: 0, dy: 130 } },
    reach: 30,
    motion: { type: 'orbit', radius: 30, period: 3.6, clock: 'chase', hop: 2.5 },
    pages: [
      "Bzzt! Careful. I'm not a bug, I'm a feature.",
      'True story: in Street Fighter II, players found they could land a second hit before the opponent had recovered from the first.',
      'It was never meant to work. It was a bug! The developers kept it, and combos became the heart of fighting games.',
      'Moral: some bugs are just features nobody planned yet.',
    ],
  },
];