/**
 * Navbar content. Edit ONLY this file to change the menu, the avatar or the default travel animation.
 * Every leaf item's `poi` must match an `id` in general-district.zones.json.
 */

/** Height of the navbar in px. The minimap and big map are pushed down by this much. */
export const NAV_HEIGHT = 52;

export interface NavItem {
  label: string;
  /** POI id to travel to. Leave out on items that only hold `children`. */
  poi?: string;
  /** Per-item travel animation (a name registered in quick-travel.ts). Falls back to TRAVEL.defaultEffect. */
  effect?: string;
  /** Makes this item a dropdown. Nesting deeper than one level works too. */
  children?: NavItem[];
}

export interface SpriteCrop {
  frameW: number;
  frameH: number;
  frame: number;
  crop: { x: number; y: number; w: number };
}

export const AVATAR = {
  src: '/sprites/player_idle.png',
  alt: 'Sajad',
  /** Outer diameter in px (must fit inside NAV_HEIGHT with its ring). */
  size: 40,
  /** Clicking the avatar travels here. Set to undefined for a plain, non-clickable avatar. */
  poi: 'about-me' as string | undefined,
  /**
   * PLACEHOLDER: crops the player's head out of the idle sprite sheet.
   * When you have a real PNG: set `src` to it and delete this `sprite` line.
   */
  sprite: { frameW: 32, frameH: 48, frame: 1, crop: { x: 4, y: 0, w: 24 } } as SpriteCrop | undefined,
};

export const TRAVEL = {
  /** 'instant' | 'fade' | anything you register with registerTravelEffect() */
  defaultEffect: 'fade',
};

export const NAV: NavItem[] = [
  { label: 'About', poi: 'about-me' },
  {
    label: 'Experience',
    children: [
      { label: 'Psyra', poi: 'job-1' },
      { label: 'Client Work', poi: 'job-2' },
      { label: 'Interns & Delivery', poi: 'job-3' },
    ],
  },
  { label: 'Projects', poi: 'projects' },
  { label: 'Skills', poi: 'skills' },
  {
    label: 'More',
    children: [
      { label: 'Education', poi: 'education' },
      { label: 'Certifications', poi: 'certs' },
      { label: 'Currently Sharpening', poi: 'sharpening' },
    ],
  },
  { label: 'Contact', poi: 'contact' },
  { label: 'Full CV', poi: 'cv-download' },
];