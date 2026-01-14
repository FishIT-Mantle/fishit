"use client";

import { Button } from "@/components/Button";
import { ZoneConfig } from "@/lib/gameplay/zones";
import { useState, useRef, useCallback, useEffect } from "react";
import FishingGameWrapper from "./FishingGameWrapper";
import { FishingGameHandle } from "./FishingGame";
import { GamePhase } from "@/lib/phaser/MainScene";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { GAME_ADDRESS, GAME_ABI } from "@/lib/contracts";
import { CollectionModal } from "@/components/CollectionModal";

interface GameplayViewProps {
    zone: ZoneConfig;
    onOpenShop: () => void;
}

export function GameplayView({ zone, onOpenShop }: GameplayViewProps) {
    const [isRecentExpanded, setIsRecentExpanded] = useState(false);
    const [isBaitsExpanded, setIsBaitsExpanded] = useState(true);
    const [selectedBaitId, setSelectedBaitId] = useState<string | null>("common-worm");
    const [recentCatches, setRecentCatches] = useState<{ name: string; rarity: string }[]>([]);
    const [gamePhase, setGamePhase] = useState<GamePhase>('IDLE');

    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const fishingGameRef = useRef<FishingGameHandle>(null);

    // Blockchain Hooks
    const { isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const { writeContract, data: hash, error: writeError } = useWriteContract();

    // Watch for transaction confirmation
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const baits = [
        {
            id: "epic-gold",
            name: "Epic Gold Bait",
            icon: "🐠",
            count: 5,
            chance: "Legendary Fish Chance: 5%",
            type: "epic",
            contractValue: 2
        },
        {
            id: "common-worm",
            name: "Common Worm Bait",
            icon: "🪱",
            count: 12,
            chance: "Legendary Fish Chance: 0.5%",
            type: "common",
            contractValue: 0
        }
    ];

    const handleCastLine = useCallback(() => {
        if (!isConnected) {
            if (openConnectModal) openConnectModal();
            return;
        }

        const selectedBait = baits.find(b => b.id === selectedBaitId);
        const baitValue = selectedBait ? selectedBait.contractValue : 0;
        const zoneValue = 0;

        console.log(`🎣 Casting Line... Bait: ${baitValue}, Zone: ${zoneValue}`);

        writeContract({
            address: GAME_ADDRESS,
            abi: GAME_ABI,
            functionName: 'castLine',
            args: [baitValue, zoneValue],
        }, {
            onSuccess: () => {
                console.log("✅ Transaction sent! Starting animation...");
                if (fishingGameRef.current && gamePhase === 'IDLE') {
                    fishingGameRef.current.castLine();
                }
            },
            onError: (err) => {
                console.error("❌ User rejected or tx failed:", err);
            }
        });

    }, [isConnected, selectedBaitId, gamePhase, writeContract, openConnectModal]);

    const handleLure = useCallback(() => {
        if (fishingGameRef.current && gamePhase === 'WAITING') {
            fishingGameRef.current.lure();
        }
    }, [gamePhase]);

    const handlePhaseChange = useCallback((phase: GamePhase) => {
        setGamePhase(phase);
    }, []);

    const handleCatchSuccess = useCallback((fishData: { name: string; rarity: string }) => {
        setRecentCatches(prev => [fishData, ...prev.slice(0, 4)]);
    }, []);

    const handleCatchFail = useCallback(() => {
        console.log('Fish got away!');
    }, []);

    useEffect(() => {
        if (isConfirming) console.log("⏳ Transaction confirming...");
        if (isConfirmed) console.log("🎉 Transaction confirmed on block!");
        if (writeError) {
            console.error("🚨 Write Error:", writeError);
            // Show user-friendly error message
            if (writeError.message.includes("rate limited")) {
                alert("⏰ Please wait before casting again! The contract has a cooldown period.");
            }
        }
    }, [isConfirming, isConfirmed, writeError]);

    // Debug: Log when modal state changes
    useEffect(() => {
        console.log("🐟 Collection Modal Open:", isCollectionOpen);
    }, [isCollectionOpen]);

    const showCastButton = gamePhase === 'IDLE' || gamePhase === 'CAUGHT' || gamePhase === 'FAILED';

    return (
        <div className="relative w-full h-screen overflow-hidden">

            {/* PHASER GAME LAYER - Behind HUD */}
            <FishingGameWrapper
                ref={fishingGameRef}
                zone={zone}
                boatUrl="/gameplay/kapal.webp"
                rodUrl="/gameplay/pancingan.webp"
                onPhaseChange={handlePhaseChange}
                onCatchSuccess={handleCatchSuccess}
                onCatchFail={handleCatchFail}
            />

            {/* HUD LAYER - On top of game */}
            <div className="absolute inset-0 z-10 flex flex-col p-6 pointer-events-none">

                {/* Top HUD (Widgets) */}
                <div className="flex justify-between items-start w-full pointer-events-auto pt-20 px-6">

                    {/* LEFT WIDGET: MY BAITS COLLECTION */}
                    <div className={`w-[340px] transition-all duration-300 ease-in-out rounded-[32px] backdrop-blur-2xl bg-gradient-to-b from-[#22D3EE]/20 via-[#4F46E5]/10 to-[#1E3A8A]/40 border border-[#A5F3FC]/20 shadow-[0_8px_32px_rgba(31,38,135,0.37)] flex flex-col overflow-hidden animate-fade-in-left ${isBaitsExpanded ? 'h-auto' : 'h-[72px] hover:bg-white/5'}`}>

                        <div
                            className="flex items-center justify-between px-6 py-5 cursor-pointer"
                            onClick={() => setIsBaitsExpanded(!isBaitsExpanded)}
                        >
                            <h3 className="text-white text-lg font-medium tracking-wide drop-shadow-md">My Baits Collection</h3>
                            <svg className={`w-6 h-6 text-white/80 transition-transform duration-300 ${isBaitsExpanded ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </div>

                        <div className={`px-5 pb-5 space-y-3 transition-opacity duration-300 ${isBaitsExpanded ? 'opacity-100' : 'opacity-0'}`}>
                            {baits.map((bait) => {
                                const isSelected = selectedBaitId === bait.id;
                                return (
                                    <div
                                        key={bait.id}
                                        onClick={() => setSelectedBaitId(bait.id)}
                                        className={`relative w-full h-[88px] rounded-[20px] transition-all duration-300 cursor-pointer group flex items-center px-4 gap-4 overflow-hidden border
                                            ${isSelected
                                                ? 'bg-gradient-to-r from-[#818CF8]/40 to-[#6366F1]/40 border-[#A5F3FC]/50 shadow-[0_0_15px_rgba(139,92,246,0.3)] ring-1 ring-[#A5F3FC]/30'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 shadow-sm flex items-center gap-1 z-10">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                                Used
                                            </div>
                                        )}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl shadow-inner transition-colors duration-300
                                            ${isSelected
                                                ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
                                                : 'bg-white/5 grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100'
                                            }
                                        `}>
                                            {bait.icon}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center z-10">
                                            <span className={`text-base font-bold leading-tight mb-0.5 transition-colors duration-300 ${isSelected ? 'text-white' : 'text-white/90'}`}>
                                                {bait.name}
                                            </span>
                                            <span className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${isSelected ? 'text-[#A5F3FC]' : 'text-white/50'}`}>
                                                {bait.chance}
                                            </span>
                                        </div>
                                        <div className="text-white font-bold text-base mt-4 z-10">x{bait.count}</div>
                                        {isSelected && (
                                            <div className="absolute inset-0 rounded-[20px] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 opacity-50 pointer-events-none animate-shimmer" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={`px-5 pb-6 transition-opacity duration-300 ${isBaitsExpanded ? 'opacity-100' : 'opacity-0'}`}>
                            <button
                                onClick={onOpenShop}
                                className="w-full h-[52px] rounded-2xl bg-[#5448E8] hover:bg-[#4B40D0] text-white text-base font-semibold shadow-lg shadow-[#5448E8]/30 transition-all active:scale-95 border-t border-white/20"
                            >
                                Shop More Baits
                            </button>
                        </div>
                    </div>

                    {/* RIGHT WIDGET: RECENT CATCHES */}
                    <div className={`w-[340px] transition-all duration-300 ease-in-out rounded-[32px] backdrop-blur-2xl bg-gradient-to-b from-[#22D3EE]/20 via-[#4F46E5]/10 to-[#1E3A8A]/40 border border-[#A5F3FC]/20 shadow-[0_8px_32px_rgba(31,38,135,0.37)] flex flex-col overflow-hidden animate-fade-in-right ${isRecentExpanded ? 'h-[300px]' : 'h-[72px] hover:bg-white/5'}`}>

                        <div
                            className="flex items-center justify-between px-6 py-5 cursor-pointer"
                            onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                        >
                            <span className="text-white text-lg font-medium tracking-wide drop-shadow-sm">Recent Catches</span>
                            <svg className={`w-6 h-6 text-white/80 transition-transform duration-300 ${isRecentExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        <div className={`px-6 pb-6 overflow-y-auto transition-opacity duration-300 ${isRecentExpanded ? 'opacity-100' : 'opacity-0'}`}>
                            {recentCatches.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center opacity-70">
                                    <div className="w-12 h-12 mb-3 text-3xl opacity-50">🕸️</div>
                                    <p className="text-white/80 text-sm font-medium">No catches yet.</p>
                                    <p className="text-white/50 text-xs mt-1">Cast your line to catch some fish!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentCatches.map((fish, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                            <span className="text-2xl">🐟</span>
                                            <div className="flex-1">
                                                <p className="text-white text-sm font-medium">{fish.name}</p>
                                                <p className={`text-xs ${fish.rarity === 'Epic' ? 'text-purple-400' :
                                                    fish.rarity === 'Rare' ? 'text-blue-400' :
                                                        fish.rarity === 'Uncommon' ? 'text-green-400' :
                                                            'text-white/50'
                                                    }`}>{fish.rarity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Game Phase Indicator */}
                {gamePhase !== 'IDLE' && gamePhase !== 'CAUGHT' && gamePhase !== 'FAILED' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="px-6 py-3 rounded-full bg-black/50 backdrop-blur-md text-white text-lg font-bold animate-pulse">
                            {gamePhase === 'CASTING' && '🎣 Casting...'}
                            {gamePhase === 'WAITING' && '⏳ Tap LURE to attract fish!'}
                            {gamePhase === 'STRIKE' && '⚡ FISH ON!'}
                            {gamePhase === 'REELING' && '🎯 Keep the bar on the fish!'}
                        </div>
                    </div>
                )}

                {/* Bottom HUD: Cast Button or Lure Button */}
                <div className="mt-auto w-full flex justify-center pb-12 z-20 pointer-events-auto">
                    {showCastButton ? (
                        <Button
                            onClick={handleCastLine}
                            disabled={isConfirming || !isConnected}
                            className="!w-[280px] !h-[64px] !text-xl !font-bold shadow-[0_4px_30px_rgba(84,72,232,0.6)] border-t border-white/20 animate-bounce-subtle !rounded-full disabled:opacity-50 disabled:animate-none"
                        >
                            {isConfirming ? "Confirming..." : "Cast Line"}
                        </Button>
                    ) : gamePhase === 'WAITING' ? (
                        <Button
                            onClick={handleLure}
                            className="!w-[200px] !h-[56px] !text-lg !font-bold shadow-[0_4px_30px_rgba(34,211,238,0.6)] border-t border-white/20 !rounded-full !bg-gradient-to-r !from-cyan-500 !to-blue-500"
                        >
                            🎣 LURE
                        </Button>
                    ) : null}
                </div>

            </div>

            {/* CENTER WIDGET: COLLECTION BUTTON - MUST have pointer-events-auto */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                <button
                    onClick={() => {
                        console.log("🎒 MY FISH BUTTON CLICKED!");
                        setIsCollectionOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full hover:bg-white/10 transition-all hover:scale-105 active:scale-95 group"
                >
                    <span className="text-2xl group-hover:rotate-12 transition-transform">🎒</span>
                    <span className="font-bold text-white tracking-wide">My Fish</span>
                </button>
            </div>

            {/* COLLECTION MODAL - CRITICAL: Must be outside pointer-events-none container and have explicit z-index */}
            {isCollectionOpen && (
                <div className="fixed inset-0 z-[9999] pointer-events-auto">
                    <CollectionModal
                        isOpen={isCollectionOpen}
                        onClose={() => {
                            console.log("🚪 CLOSING MODAL");
                            setIsCollectionOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
