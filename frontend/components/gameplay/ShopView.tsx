import { Button } from "@/components/Button";
import { ZoneConfig } from "@/lib/gameplay/zones";
import Image from "next/image";

interface ShopViewProps {
    zone: ZoneConfig;
    onClose: () => void;
}

export function ShopView({ zone, onClose }: ShopViewProps) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl bg-[#1C2C65]/90 border border-white/20 rounded-[32px] p-8 shadow-2xl">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
                >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center gap-2 mb-2">
                        <span className="text-white/70 text-sm font-medium">MANCING - chosen</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Shop The Baits First before Fishing</h2>
                </div>

                {/* Baits Grid (Placeholder based on design) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Common Bait */}
                    <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full mb-4 flex items-center justify-center text-3xl">🪱</div>
                        <h3 className="text-white font-semibold mb-1">Common Worm Bait</h3>
                        <p className="text-2xl font-bold text-white mb-6">1 MNT</p>
                        <Button className="w-full !h-10 !text-sm !bg-[#5448E8]">Purchase</Button>
                    </div>

                    {/* Rare Bait */}
                    <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full mb-4 flex items-center justify-center text-3xl">🎣</div>
                        <h3 className="text-white font-semibold mb-1">Rare Lure Bait</h3>
                        <p className="text-2xl font-bold text-white mb-6">2 MNT</p>
                        <Button className="w-full !h-10 !text-sm !bg-[#5448E8]">Purchase</Button>
                    </div>

                    {/* Epic Bait */}
                    <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full mb-4 flex items-center justify-center text-3xl">🐠</div>
                        <h3 className="text-white font-semibold mb-1">Epic Gold Bait</h3>
                        <p className="text-2xl font-bold text-white mb-6">4 MNT</p>
                        <Button className="w-full !h-10 !text-sm !bg-[#5448E8]">Purchase</Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
