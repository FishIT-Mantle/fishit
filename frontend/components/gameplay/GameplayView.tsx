import { Button } from "@/components/Button";
import { Zone } from "@/lib/gameplay/zones";

interface GameplayViewProps {
    zone: Zone;
    onOpenShop: () => void;
}

export function GameplayView({ zone, onOpenShop }: GameplayViewProps) {
    return (
        <div className="relative z-10 w-full h-screen flex flex-col p-6">

            {/* Top HUD (Widgets placeholder) */}
            <div className="flex justify-between items-start w-full">
                {/* Left: My Baits Collection Widget */}
                <div className="w-64 h-32 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 p-4 animate-fade-in-left">
                    <h3 className="text-white text-sm font-semibold mb-2">My Baits Collection</h3>
                    <p className="text-white/50 text-xs">No baits loaded</p>

                    <button
                        onClick={onOpenShop}
                        className="mt-4 w-full py-1.5 rounded-lg bg-[#5448E8] text-white text-xs font-medium hover:bg-[#4B40D0] transition-colors"
                    >
                        Shop More Baits
                    </button>
                </div>

                {/* Right: Recent Catches Widget */}
                <div className="w-64 h-16 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex items-center justify-between animate-fade-in-right">
                    <span className="text-white text-sm font-medium">Recent Catches</span>
                    <span className="text-white/50 text-xs">▼</span>
                </div>
            </div>

            {/* Middle: BOAT LAYER PLACEHOLDER */}
            {/* This is where the boat image will be fixed at the bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none">
                {/* Placeholder for Boat Image */}
                <div className="w-full h-full bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-20">
                    <span className="text-white/30 font-bold text-4xl">BOAT LAYER</span>
                </div>
            </div>

            {/* Bottom HUD: Cast Button */}
            <div className="mt-auto w-full flex justify-center pb-10 z-20">
                <Button
                    className="!w-64 !h-16 !text-xl !font-bold shadow-[0_0_50px_rgba(84,72,232,0.5)] animate-bounce-subtle"
                >
                    Cast Line
                </Button>
            </div>

        </div>
    );
}
