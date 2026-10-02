"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "../game/LoadingScreen";;

const PhaserGame = dynamic(()=>import ("@/components/frontend/game/FrontendGameCanvas"),{
    ssr:false,
    loading:() => <LoadingScreen progress={0.04} label="Loading Coast....."/>,
});

export default function FrontendPhaserGameLoader(){
    return <PhaserGame/>;
}