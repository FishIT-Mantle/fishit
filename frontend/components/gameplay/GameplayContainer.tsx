"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Zone } from "@/lib/gameplay/zones";
import { IntroView } from "./IntroView";
import { GameplayView } from "./GameplayView";
import { ShopView } from "./ShopView";

interface GameplayContainerProps {
    zone: Zone;
}

type GameState = 'INTRO' | 'PLAYING' | 'SHOP';

export default function GameplayContainer({ zone }: GameplayContainerProps) {
    const [gameState, setGameState] = useState<GameState>('INTRO');

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#0D1936] text-white font-sans selection:bg-cyan-500/30">
            {/* --- BACKGROUND LAYER (Always Visible) --- */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={zone.background}
                    alt={zone.name}
                    fill
                    priority
                    className="object-cover object-center"
                    quality={100}
                />
                {/* Overlay for readability - Slightly darker in Intro */}
                <div className={`absolute inset-0 bg-black/30 transition-opacity duration-1000 ${gameState === 'INTRO' ? 'opacity-100' : 'opacity-10'}`} />
            </div>

            {/* --- NAVBAR LAYER (Always Visible) --- */}
            <nav className="absolute top-0 left-0 w-full z-30 px-6 py-6 md:px-12 flex items-center justify-between">
                <Link href="/dashboard" className="block relative flex-shrink-0 transition-all group pl-2">
                    <div className="relative w-32 md:w-40 h-10">
                        <Image
                            src="/images/logo-name.webp"
                            alt="Fish It"
                            fill
                            className="object-contain object-left group-hover:opacity-90 transition-opacity"
                            priority
                        />
                    </div>
                </Link>
            </nav>

            {/* --- VIEW LAYER --- */}

            {/* 1. INTRO VIEW */}
            {gameState === 'INTRO' && (
                <IntroView
                    zone={zone}
                    onStart={() => setGameState('PLAYING')}
                />
            )}

            {/* 2. GAMEPLAY VIEW (Main Game) */}
            {(gameState === 'PLAYING' || gameState === 'SHOP') && (
                <GameplayView
                    zone={zone}
                    onOpenShop={() => setGameState('SHOP')}
                />
            )}

            {/* 3. SHOP OVERLAY */}
            {gameState === 'SHOP' && (
                <ShopView
                    zone={zone}
                    onClose={() => setGameState('PLAYING')}
                />
            )}

        </div>
    );
}
