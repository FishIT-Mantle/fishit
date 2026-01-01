import { Button } from "@/components/Button";
import { Zone } from "@/lib/gameplay/zones";
import Image from "next/image";
import { useState } from "react";

interface GameplayViewProps {
    zone: Zone;
    onOpenShop: () => void;
}

export function GameplayView({ zone, onOpenShop }: GameplayViewProps) {
    const [isRecentExpanded, setIsRecentExpanded] = useState(false);
    const [isBaitsExpanded, setIsBaitsExpanded] = useState(true);
    const [selectedBaitId, setSelectedBaitId] = useState<string | null>("epic-gold"); // Default selected
    const [recentCatches, setRecentCatches] = useState<any[]>([]);

    const baits = [
        {
            id: "epic-gold",
            name: "Epic Gold Bait",
            icon: "🐠",
            count: 5,
            chance: "Legendary Fish Chance: 5%",
            type: "epic"
        },
        {
            id: "common-worm",
            name: "Common Worm Bait",
            icon: "🪱",
            count: 12,
            chance: "Legendary Fish Chance: 0.5%",
            type: "common"
        }
    ];

    return (
        <div className="relative z-10 w-full h-screen flex flex-col p-6 pointer-events-none">

            {/* Top HUD (Widgets) - Pointer events allowed */}
            <div className="flex justify-between items-start w-full pointer-events-auto pt-20 px-6">

                {/* 
                  LEFT WIDGET: MY BAITS COLLECTION 
                */}
                <div className={`w-[340px] transition-all duration-300 ease-in-out rounded-[32px] backdrop-blur-2xl bg-gradient-to-b from-[#22D3EE]/20 via-[#4F46E5]/10 to-[#1E3A8A]/40 border border-[#A5F3FC]/20 shadow-[0_8px_32px_rgba(31,38,135,0.37)] flex flex-col overflow-hidden animate-fade-in-left ${isBaitsExpanded ? 'h-auto' : 'h-[72px] hover:bg-white/5'}`}>

                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-6 py-5 cursor-pointer"
                        onClick={() => setIsBaitsExpanded(!isBaitsExpanded)}
                    >
                        <h3 className="text-white text-lg font-medium tracking-wide drop-shadow-md">My Baits Collection</h3>
                        <svg className={`w-6 h-6 text-white/80 transition-transform duration-300 ${isBaitsExpanded ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </div>

                    {/* Content List */}
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

                                    {/* Icon Container */}
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

                                    {/* Inner Glow only for Selected */}
                                    {isSelected && (
                                        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 opacity-50 pointer-events-none animate-shimmer" />
                                    )}
                                </div>
                            );
                        })}

                    </div>

                    {/* Footer Action */}
                    <div className={`px-5 pb-6 transition-opacity duration-300 ${isBaitsExpanded ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                            onClick={onOpenShop}
                            className="w-full h-[52px] rounded-2xl bg-[#5448E8] hover:bg-[#4B40D0] text-white text-base font-semibold shadow-lg shadow-[#5448E8]/30 transition-all active:scale-95 border-t border-white/20"
                        >
                            Shop More Baits
                        </button>
                    </div>
                </div>

                {/* 
                  RIGHT WIDGET: RECENT CATCHES
                  Style: Matching Glassmorphism, Expandable
                */}
                <div className={`w-[340px] transition-all duration-300 ease-in-out rounded-[32px] backdrop-blur-2xl bg-gradient-to-b from-[#22D3EE]/20 via-[#4F46E5]/10 to-[#1E3A8A]/40 border border-[#A5F3FC]/20 shadow-[0_8px_32px_rgba(31,38,135,0.37)] flex flex-col overflow-hidden animate-fade-in-right ${isRecentExpanded ? 'h-[300px]' : 'h-[72px] hover:bg-white/5'}`}>

                    {/* Header (Toggle) */}
                    <div
                        className="flex items-center justify-between px-6 py-5 cursor-pointer"
                        onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                    >
                        <span className="text-white text-lg font-medium tracking-wide drop-shadow-sm">Recent Catches</span>
                        <svg className={`w-6 h-6 text-white/80 transition-transform duration-300 ${isRecentExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {/* Content (List or Empty State) */}
                    <div className={`px-6 pb-6 overflow-y-auto transition-opacity duration-300 ${isRecentExpanded ? 'opacity-100' : 'opacity-0'}`}>
                        {recentCatches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center opacity-70">
                                <div className="w-12 h-12 mb-3 text-3xl opacity-50">🕸️</div>
                                <p className="text-white/80 text-sm font-medium">No catches yet.</p>
                                <p className="text-white/50 text-xs mt-1">Cast your line to catch some fish!</p>
                            </div>
                        ) : (
                            // List Placeholders
                            <div className="space-y-2">
                                {/* Example item if array not empty */}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Middle: BOAT LAYER PLACEHOLDER */}
            {/* This is where the boat image will be fixed at the bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[500px] pointer-events-none z-0">
                {/* Placeholder for Boat Image - removed text, just empty area for now until asset arrives */}
            </div>

            {/* Bottom HUD: Cast Button - Pointer events allowed */}
            <div className="mt-auto w-full flex justify-center pb-12 z-20 pointer-events-auto">
                <Button
                    className="!w-[340px] !h-[64px] !text-xl !font-bold shadow-[0_4px_30px_rgba(84,72,232,0.6)] border-t border-white/20 animate-bounce-subtle !rounded-[24px]"
                >
                    Cast Line
                </Button>
            </div>

        </div>
    );
}
