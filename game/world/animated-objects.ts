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
    frameRate:6,
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
    },
    {
    id: 'birdhouse-1',

    sheet: {
        key: 'birdhouse-1',
        path: '/sprites/objects/birdhouse_a_roof_bird.png',
        frameWidth: 40,
        frameHeight: 56,
    },

    anim: {
    frames: [0,1,2,3],
    frameRate:6,
    frameDuration: 175, // 1 second per frame
    repeat: -1,
    },

    spawn: {
        name: 'birdhouse-1',
        fallback: {
        dx: 0,
        dy: 0,
        },
    },

    origin: {
        x:  9,
        y: 5.5,
    },

    scale: 1,
    },
    {
    id: 'birdhouse-2',

    sheet: {
        key: 'birdhouse-2',
        path: '/sprites/objects/birdhouse_b_peekaboo.png',
        frameWidth: 40,
        frameHeight: 56,
    },

    anim: {
    frames: [0,0,0,0,0,0, 1,2,3,3,2,1, 0,0,0,0,0,0],
    frameRate:6,
    frameDuration: 125, // 1 second per frame
    repeat: -1,
    },

    spawn: {
        name: 'birdhouse-1',
        fallback: {
        dx: 0,
        dy: 0,
        },
    },

    origin: {
        x:  2.5,
        y: 5.7,
    },

    scale: 1,
    },
    {
    id: 'birdhouse-3',

    sheet: {
        key: 'birdhouse-3',
        path: '/sprites/objects/birdhouse_c_circling.png',
        frameWidth: 72,
        frameHeight: 64,
    },

    anim: {
    frames: [0,0,0,0,0,0,0,0,0,0, 1,2,3,4,5,6,7,8, 0,0,0,0,0,0],
    frameRate:6,
    frameDuration: 150, // 1 second per frame
    repeat: -1,
    },

    spawn: {
        name: 'birdhouse-1',
        fallback: {
        dx: 0,
        dy: 0,
        },
    },

    origin: {
        x:  -2.5,
        y: 5,
    },

    scale: 1,
    },
    {
    id: 'birdhouse-1',

    sheet: {
        key: 'birdhouse-1',
        path: '/sprites/objects/birdhouse_a_roof_bird.png',
        frameWidth: 40,
        frameHeight: 56,
    },

    anim: {
    frames: [0,1,2,3],
    frameRate:6,
    frameDuration: 175, // 1 second per frame
    repeat: -1,
    },

    spawn: {
        name: 'birdhouse-1',
        fallback: {
        dx: 0,
        dy: 0,
        },
    },

    origin: {
        x:  -9.5,
        y: 5.6,
    },

    scale: 1,
    },
    {
    id: 'birdhouse-2',

    sheet: {
        key: 'birdhouse-2',
        path: '/sprites/objects/birdhouse_b_peekaboo.png',
        frameWidth: 40,
        frameHeight: 56,
    },

    anim: {
    frames: [0,0,0,0,0,0, 1,2,3,3,2,1, 0,0,0,0,0,0],
    frameRate:6,
    frameDuration: 125, // 1 second per frame
    repeat: -1,
    },

    spawn: {
        name: 'birdhouse-1',
        fallback: {
        dx: 0,
        dy: 0,
        },
    },

    origin: {
        x:  -14.5,
        y: 5.6,
    },

    scale: 1,
    },
    {
    id: 'birdhouse-1',

    sheet: {
        key: 'birdhouse-1',
        path: '/sprites/objects/birdhouse_a_roof_bird.png',
        frameWidth: 40,
        frameHeight: 56,
    },

    anim: {
    frames: [0,1,2,3],
    frameRate:6,
    frameDuration: 175, // 1 second per frame
    repeat: -1,
    },

    spawn: {
        name: 'birdhouse-1',
        fallback: {
        dx: 0,
        dy: 0,
        },
    },

    origin: {
        x:  2.8,
        y: -3.3,
    },

    scale: 1,
    },

];