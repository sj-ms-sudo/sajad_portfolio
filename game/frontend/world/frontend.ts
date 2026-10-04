
import Phaser from "phaser";


export interface Rect{x:number;y:number;w:number,h:number}
export interface BlockerDef extends Rect {name:string}
export interface ExitDef extends Rect{name:string;target:string;spawn:string}
export interface CoastData{
    world:{width:number;height:number};
    background:string;
    blockers : BlockerDef[];
    exits:ExitDef[];
    spawns:Record<string,{x:number;y:number}>;
    doors?: BlockerDef[];
}

export const COAST = {
    dataKey:'frontend-district-data',
    dataPath:'/maps/frontend_district_zones.json',
    bgKey:'frontend-district-bg',
    bgPath:'/maps/frontend_district_map.webp',
} as const;

/**
 * Coast zones that live in code, so they keep working even if frontend_district_zones.json is replaced.
 * An entry in the JSON with the same exit name / spawn key wins over these.
 */
export const COAST_EXTRAS = {
    exits: [] as ExitDef[],
    spawns: {
        'from-gallery': {x:476,y:722},  // just outside the big arched building after leaving the gallery
        'npc-seagull': {x:560,y:760},   // Gully, on the sand east of the gallery door
        'npc-shark': {x:535,y:915},     // centre of Finn's circle, in open water just left of the pier
    } as Record<string,{x:number;y:number}>,
};

/** Door of the art gallery: the arched entrance of the big red-roofed hall (stand on the sand and press E). */
export const GALLERY_DOOR: Rect = {x:448,y:676,w:54,h:22};

export function withCoastExtras(data:CoastData):CoastData{
    const known = new Set(data.exits.map((e)=>e.name));
    return {
        ...data,
        exits:[...data.exits,...COAST_EXTRAS.exits.filter((e)=>!known.has(e.name))],
        spawns:{...COAST_EXTRAS.spawns,...data.spawns},
    };
}

export function preloadCoast(scene:Phaser.Scene):void{
    scene.load.image(COAST.bgKey,COAST.bgPath);
    scene.load.json(COAST.dataKey,COAST.dataPath);
}

export class Coast{
    readonly blockers:Phaser.Physics.Arcade.StaticGroup;
    private readonly exitZones:{zone:Phaser.GameObjects.Zone;def:ExitDef}[]=[];

    constructor (private readonly scene:Phaser.Scene,readonly data:CoastData,debug = false){
        const {width, height} = data.world;

        scene.add.image(0,0,COAST.bgKey).setOrigin(0,0).setDisplaySize(width,height).setDepth(-10);
        scene.physics.world.setBounds(0,0,width,height);
        scene.cameras.main.setBounds(0,0,width,height);

        this.blockers = scene.physics.add.staticGroup();
        for (const b of data.blockers){
            const r = scene.add.rectangle(b.x + b.w/2, b.y + b.h/2, b.w, b.h, 0xff0000, debug ? 0.3 : 0);
            if (debug) r.setStrokeStyle(1,0xff0000,0.9).setDepth(50);
            if (debug) scene.add.text(b.x+2,b.y+2,b.name,{fontSize:'8px',color:'#fff'}).setDepth(51);
            scene.physics.add.existing(r,true);
            this.blockers.add(r);
        }

        for (const e of data.exits){
            const zone = scene.add.zone(e.x + e.w/2, e.y +e.h/2 ,e.w , e.h);
            scene.physics.add.existing(zone,true);
            this.exitZones.push({zone,def:e});
        }
    }

    attachPlayer(player:Phaser.Physics.Arcade.Sprite,onExit:(exit:ExitDef)=>void):void{
        this.scene.physics.add.collider(player,this.blockers);
        for(const{zone,def} of this.exitZones) this.scene.physics.add.overlap(player,zone,()=>onExit(def));
    }
}