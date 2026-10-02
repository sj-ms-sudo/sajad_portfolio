'use client';

import { useEffect,useRef,useState } from "react";
import LoadingScreen from "@/components/game/LoadingScreen";
import {BOOT} from '@/game/boot-events';
import LighthouseOverlay from "@/components/frontend/lighthouse/LighthouseOverlay";
import ComponentNavbar from "@/components/frontend/lighthouse/ComponentNavbar";
import RouteBar from "@/components/ui/RouteBar";
import type { ComponentNavLink } from "@/components/frontend/lighthouse/ComponentNavbar";
import LandscapeGate from "@/components/ui/LandscapeGate";
import { SHOWCASE } from "@/components/frontend/lighthouse/showcase";
import { LIGHTHOUSE } from "@/game/frontend/lighthouse-events";

const FRONTEND_LINKS: ComponentNavLink[] = SHOWCASE.map(({ id, title }) => ({ id, label: title }));

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

    const [progress,setProgress] = useState(0.06);
    const [label,setLabel] = useState('Loading Artworks');
    const [ready,setReady] = useState(false);
    const [failed,setFailed] = useState(false);
    const [gone,setGone] = useState(false);
    const [lhOpen,setLhOpen] = useState(false);
    const [activeShowcaseId,setActiveShowcaseId] = useState<string | undefined>();

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

    useEffect(()=>{
        if (!ready) return;
        const t = setTimeout(()=>setGone(true),600);
        return ()=>clearTimeout(t);
    },[ready]);

    return(
        <>
            <div ref = {containerRef} style={{position:'fixed',inset:0}} className="inline-block leading-none"/>
            {!gone && <LoadingScreen progress={progress} label = {ready ? 'Ready' : label} hidden={ready} error={failed}/>}
            {ready && <ComponentNavbar sectionLabel="COMPONENTS" items={FRONTEND_LINKS} disabled={!ready} onSelect={(id) => gameRef.current?.events.emit(LIGHTHOUSE.travel, id)} />}
            <LandscapeGate />
            {lhOpen && <LighthouseOverlay initialShowcaseId={activeShowcaseId} onClose={()=>{ setLhOpen(false); gameRef.current?.events.emit(LIGHTHOUSE.close); }}/>}
            <RouteBar active="frontend"/>
        </>
    );
 }
