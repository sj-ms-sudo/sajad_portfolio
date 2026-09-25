import type { AnimatedObjectDef } from './animated-object-system';

export const ANIMATED_OBJECTS: AnimatedObjectDef[] = [
    {
    id: 'fountain-center',

    sheet: {
        key: 'fountain-center',
        path: '/sprites/objects/fountain_v1_1.png',
        frameWidth: 64,
        frameHeight: 58,
    },

    anim: {
    frames: [0,1,2,3,4,5],
    frameDuration: 175, // 1 second per frame
    repeat: -1,
    },

    spawn: {
        name: 'fountain',
        fallback: {
        dx: 0,
        dy: 0,
        },
    },

    origin: {
        x: 0.5,
        y: 1,
    },

    scale: 1.5,
    }
];