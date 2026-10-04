'use client';

import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/game/LoadingScreen";
import {BOOT} from '@/game/boot-events';
import LighthouseOverlay from "@/components/frontend/lighthouse/LighthouseOverlay";
import ComponentNavbar from "@/components/frontend/lighthouse/ComponentNavbar";
import RouteBar from "@/components/ui/RouteBar";
import type { ComponentNavLink } from "@/components/frontend/lighthouse/ComponentNavbar";
import LandscapeGate from "@/components/ui/LandscapeGate";
import { SHOWCASE } from "@/components/frontend/lighthouse/showcase";
import { WEBSITES } from "@/components/frontend/lighthouse/websites";
import { LIGHTHOUSE } from "@/game/frontend/lighthouse-events";
import { GALLERY } from "@/game/frontend/gallery-events";
import { NAVIGATION } from "@/game/navigation-events";
import { consumeSpawnParam, districtUrl } from "@/game/district-routes";

// Navbar: lighthouse components first, then the gallery's website designs (ids prefixed so the two lists never clash)
const SITE_PREFIX = 'site:';
const FRONTEND_LINKS: ComponentNavLink[] = [
    ...SHOWCASE.map(({ id, title }) => ({ id, label: title, group: 'LIGHTHOUSE' })),
    ...WEBSITES.map(({ id, title }) => ({ id: SITE_PREFIX + id, label: title, group: 'GALLERY' })),
];

// Wait from google fonts
async function waitForFont():Promise<void>{
    if (typeof document == 'undefined' || !document.fonts) return;
    try{
        await Promise.race([
            Promise.all([document.fonts.load('16px "Silkscreen"'),document.fonts.load('bold 16px "Silkscreen"')]),
            new Promise((resolve) => setTimeout(resolve,3000)),
        ]);
    } catch{
        // Uses default font
    }
}

export default function FrontendGameCanvas(){
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<import('phaser').Game | null>(null);
    const router = useRouter();
    const routerRef = useRef(router);
    useEffect(()=>{ routerRef.current = router; },[router]);

    const [progress,setProgress] = useState(0.06);
    const [label,setLabel] = useState('Loading Artworks');
    const [ready,setReady] = useState(false);
    const [failed,setFailed] = useState(false);
    const [gone,setGone] = useState(false);
    const [lhOpen,setLhOpen] = useState(false);
    const [activeShowcaseId,setActiveShowcaseId] = useState<string | undefined>();
    const [galleryOpen,setGalleryOpen] = useState(false);
    const [galleryShowcaseId,setGalleryShowcaseId] = useState<string | undefined>();

    useEffect(()=>{
        const el = containerRef.current;
        if (!el || gameRef.current) return;

        let cancelled = false;

        (async ()=>{
            const [{default:Phaser},{createGameConfig}] = await Promise.all([
                import ('phaser'),
                import ('@/game/frontend/config')
            ]);
            if (cancelled || !containerRef.current) return;

            setProgress(0.12);
            setLabel('Loading fonts');
            await waitForFont();
            if (cancelled || !containerRef.current) return;

            setLabel('Loading the coast');
            const game = new Phaser.Game(createGameConfig(containerRef.current));
            gameRef.current = game;

            game.events.on(BOOT.progress,(v:number)=>{
                if (!cancelled) setProgress(0.15 +v*0.8);
            });
            game.events.once(BOOT.ready,()=>{
                if(cancelled) return;
                setProgress(1);
                setReady(true);
            });
            game.events.once(BOOT.error,()=>{
                if (!cancelled) setFailed(true);
            });
            // arriving from the General district (?spawn=...) and walking off the map into it
            const spawn = consumeSpawnParam();
            if (spawn) game.registry.set('spawn',spawn);
            game.events.on(NAVIGATION.leaveDistrict,(target:string,to:string)=>{
                const url = districtUrl(target,to);
                if (!cancelled && url) routerRef.current.push(url);
            });
            // the gallery scene needs to know which showcase items exist (painting N shows item N % count)
            game.registry.set('showcaseIds',WEBSITES.map((s)=>s.id));
            game.registry.set('showcaseCount',WEBSITES.length);
            game.events.on(GALLERY.open,(slot:number)=>{
                if(cancelled || WEBSITES.length===0) return;
                setGalleryShowcaseId(WEBSITES[((slot%WEBSITES.length)+WEBSITES.length)%WEBSITES.length].id);
                setGalleryOpen(true);
            });
            game.events.on(LIGHTHOUSE.open,(showcaseId?: string)=>{
                if(cancelled) return;
                setActiveShowcaseId(showcaseId);
                setLhOpen(true);
            });
        })();

        return ()=>{
            cancelled=true;
            gameRef.current?.destroy(true);
            gameRef.current=null;
        };
    },[]);

    /** Navbar jump from ANY scene (coast, lighthouse or gallery): website ids go to the gallery, the rest to the lighthouse. */
    const travelTo = (id:string)=>{
        const g = gameRef.current;
        if (!g) return;
        const inScene = (k:string)=>g.scene.isActive(k);
        if (id.startsWith(SITE_PREFIX)){
            const siteId = id.slice(SITE_PREFIX.length);
            if (inScene('GalleryScene')) g.events.emit(GALLERY.travel,siteId);
            else {
                ['CoastScene','LighthouseScene'].forEach((k)=>{ if (inScene(k)) g.scene.stop(k); });
                g.scene.start('GalleryScene',{spawn:'start',showcaseId:siteId});
            }
        } else if (inScene('GalleryScene')){
            g.scene.stop('GalleryScene');
            g.scene.start('LighthouseScene',{spawn:'from-binoculars',showcaseId:id});
        } else g.events.emit(LIGHTHOUSE.travel,id);
    };

    useEffect(()=>{
        if (!ready) return;
        const t = setTimeout(()=>setGone(true),600);
        return ()=>clearTimeout(t);
    },[ready]);

    return(
        <>
            <div ref = {containerRef} style={{position:'fixed',inset:0}} className="inline-block leading-none"/>
            {!gone && <LoadingScreen progress={progress} label = {ready ? 'Ready' : label} hidden={ready} error={failed}/>}
            {ready && <ComponentNavbar sectionLabel="FRONTEND" items={FRONTEND_LINKS} disabled={!ready} onSelect={(id) => travelTo(id)} />}
            <LandscapeGate />
            {lhOpen && <LighthouseOverlay initialShowcaseId={activeShowcaseId} onClose={()=>{ setLhOpen(false); gameRef.current?.events.emit(LIGHTHOUSE.close); }}/>}
            {galleryOpen && <LighthouseOverlay items={WEBSITES} traversal="buttons" label="Art gallery" initialShowcaseId={galleryShowcaseId} onClose={()=>{ setGalleryOpen(false); gameRef.current?.events.emit(GALLERY.close); }}/>}
            <RouteBar active="frontend"/>
        </>
    );
 }
