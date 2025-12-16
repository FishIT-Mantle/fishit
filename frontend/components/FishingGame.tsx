'use client';

import { useState } from 'react';

type BaitType = 'common' | 'rare' | 'epic';

const BAITS = {
    common: { name: 'Worm', price: 0.05, color: 'bg-zinc-600', chances: '70% Common' },
    rare: { name: 'Cricket', price: 0.15, color: 'bg-blue-600', chances: '50% Common, 35% Rare' },
    epic: { name: 'Spinner', price: 0.50, color: 'bg-purple-600', chances: '30% Common, 25% Epic' },
};

export function FishingGame() {
    const [selectedBait, setSelectedBait] = useState<BaitType>('common');
    const [isFishing, setIsFishing] = useState(false);

    const handleCast = () => {
        setIsFishing(true);
        // Simulate flow
        setTimeout(() => setIsFishing(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
            {/* Game Viewport */}
            <div className="flex-1 relative bg-gradient-to-b from-sky-900/20 to-blue-900/40 min-h-[300px] flex items-center justify-center p-8">
                <div className="absolute top-4 right-4 bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <span className="text-yellow-400 font-bold mr-2">⚡ 12</span>
                    <span className="text-zinc-400 text-xs">Energy</span>
                </div>

                <div className="text-center">
                    {isFishing ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="text-4xl">🎣</div>
                            <div className="text-cyan-300 font-medium">Waiting for bite...</div>
                        </div>
                    ) : (
                        <div className="space-y-4 opacity-50">
                            <div className="text-4xl">🌊</div>
                            <div className="text-zinc-500 font-medium">Ready to cast</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 bg-black/20 border-t border-white/5">
                <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Select Bait</h3>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {(Object.entries(BAITS) as [BaitType, typeof BAITS['common']][]).map(([key, bait]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedBait(key)}
                            className={`relative p-3 rounded-xl border transition-all text-left ${selectedBait === key
                                    ? 'bg-white/5 border-cyan-500/50 ring-1 ring-cyan-500/50'
                                    : 'bg-transparent border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full mb-2 ${bait.color}`} />
                            <div className="font-medium text-white text-sm">{bait.name}</div>
                            <div className="text-xs text-zinc-500">{bait.price} MNT</div>
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-zinc-500">
                        {BAITS[selectedBait].chances}
                    </div>
                </div>

                <button
                    onClick={handleCast}
                    disabled={isFishing}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isFishing ? 'Reeling in...' : 'CAST LINE'}
                </button>
            </div>
        </div>
    );
}
