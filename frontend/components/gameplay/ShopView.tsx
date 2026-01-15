import { Button } from "@/components/Button";
import { ZoneConfig } from "@/lib/gameplay/zones";
import Image from "next/image";
import { usePurchaseBait } from "@/lib/hooks/usePurchaseBait";
import { BaitType } from "@/lib/hooks/useBaitBalance";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

interface ShopViewProps {
    zone: ZoneConfig;
    onClose: () => void;
}

export function ShopView({ zone, onClose }: ShopViewProps) {
    const { isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const { purchase, isPending, isConfirming, isSuccess, hash } = usePurchaseBait();

    // Track which bait is currently being purchased to show loading state on specific card
    const [purchasingType, setPurchasingType] = useState<BaitType | null>(null);

    // Reset purchasing state when transaction flow completes or fails
    useEffect(() => {
        if (!isPending && !isConfirming) {
            setPurchasingType(null);
        }
    }, [isPending, isConfirming]);

    const handlePurchase = (type: BaitType) => {
        if (!isConnected) {
            if (openConnectModal) openConnectModal();
            return;
        }
        setPurchasingType(type);
        purchase(type, 1); // Default purchase amount: 1
    };

    // Helper to get button text
    const getButtonText = (type: BaitType) => {
        if (purchasingType !== type) return "Purchase";
        if (isPending) return "Check Wallet...";
        if (isConfirming) return "Confirming...";
        return "Purchase";
    };

    const isGlobalLoading = isPending || isConfirming;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#1C2C65]/95 to-[#0F1A3E]/95 border border-white/20 rounded-[32px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    disabled={isGlobalLoading}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center gap-2 mb-2">
                        <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Zone: {zone.name}</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Bait Shop</h2>
                    <p className="text-white/50 text-sm">Stock up on baits to catch rare fish!</p>
                </div>

                {/* Baits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Common Bait Card */}
                    <div className="relative rounded-3xl p-6 border border-[#5060D7]/30 bg-[radial-gradient(circle_at_center,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)] flex flex-col items-center text-center group hover:border-[#5060D7]/60 transition-all">
                        <div className="w-24 h-24 mb-4 relative drop-shadow-[0_4px_24px_rgba(80,96,215,0.4)] transition-transform group-hover:scale-110 duration-300">
                            <Image src="/bait/common-bait.webp" alt="Common Worm Bait" fill className="object-contain" />
                        </div>
                        <h3 className="text-white text-lg font-medium mb-1">Common Worm Bait</h3>
                        <p className="text-4xl font-bold text-white mb-4">1 MNT</p>

                        <div className="px-4 py-1.5 rounded-full bg-[#2A3778]/50 border border-[#5060D7]/30 text-[#A0AEC0] text-xs mb-6">
                            Role: Grinding / High Junk
                        </div>

                        <div className="space-y-2 mb-8 text-sm text-[#E2E8F0]">
                            <div className="flex items-center gap-2 justify-center">
                                <span>🔥</span>
                                <span>Best for Zone 1 & 2</span>
                            </div>
                            <div className="flex items-center gap-2 justify-center text-yellow-400">
                                <span>⚠️</span>
                                <span>High Junk Chance</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => handlePurchase(BaitType.Common)}
                            disabled={isGlobalLoading}
                            className={`w-full !rounded-full !h-12 !text-base shadow-[0_4px_20px_rgba(80,96,215,0.4)] mt-auto
                                ${purchasingType === BaitType.Common ? '!bg-[#4B40D0] animate-pulse' : '!bg-[#5060D7] hover:!bg-[#4351B5]'}
                            `}
                        >
                            {getButtonText(BaitType.Common)}
                        </Button>
                    </div>

                    {/* Rare Bait Card */}
                    <div className="relative rounded-3xl p-6 border border-[#5060D7]/30 bg-[radial-gradient(circle_at_center,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)] flex flex-col items-center text-center group hover:border-[#5060D7]/60 transition-all">
                        <div className="w-24 h-24 mb-4 relative drop-shadow-[0_4px_24px_rgba(80,96,215,0.4)] transition-transform group-hover:scale-110 duration-300">
                            <Image src="/bait/rare-bait.webp" alt="Rare Lure Bait" fill className="object-contain" />
                        </div>
                        <h3 className="text-white text-lg font-medium mb-1">Rare Lure Bait</h3>
                        <p className="text-4xl font-bold text-white mb-4">2 MNT</p>

                        <div className="px-4 py-1.5 rounded-full bg-[#2A3778]/50 border border-[#5060D7]/30 text-[#A0AEC0] text-xs mb-6">
                            Role: Efficiency
                        </div>

                        <div className="space-y-2 mb-8 text-sm text-[#E2E8F0]">
                            <div className="flex items-center gap-2 justify-center">
                                <span>🔥</span>
                                <span>Best for Zone 2 & 3</span>
                            </div>
                            <div className="flex items-center gap-2 justify-center text-yellow-400">
                                <span>⚠️</span>
                                <span>Reduced Junk Chance</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => handlePurchase(BaitType.Rare)}
                            disabled={isGlobalLoading}
                            className={`w-full !rounded-full !h-12 !text-base shadow-[0_4px_20px_rgba(80,96,215,0.4)] mt-auto
                                ${purchasingType === BaitType.Rare ? '!bg-[#4B40D0] animate-pulse' : '!bg-[#5060D7] hover:!bg-[#4351B5]'}
                            `}
                        >
                            {getButtonText(BaitType.Rare)}
                        </Button>
                    </div>

                    {/* Epic Bait Card */}
                    <div className="relative rounded-3xl p-6 border border-[#5060D7]/30 bg-[radial-gradient(circle_at_center,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)] flex flex-col items-center text-center group hover:border-[#5060D7]/60 transition-all">
                        <div className="w-24 h-24 mb-4 relative drop-shadow-[0_4px_24px_rgba(80,96,215,0.4)] transition-transform group-hover:scale-110 duration-300">
                            <Image src="/bait/epic-bait.webp" alt="Epic Gold Bait" fill className="object-contain" />
                        </div>
                        <h3 className="text-white text-lg font-medium mb-1">Epic Gold Bait</h3>
                        <p className="text-4xl font-bold text-white mb-4">4 MNT</p>

                        <div className="px-4 py-1.5 rounded-full bg-[#2A3778]/50 border border-[#5060D7]/30 text-[#A0AEC0] text-xs mb-6">
                            Role: High Risk / Key
                        </div>

                        <div className="space-y-2 mb-8 text-sm text-[#E2E8F0]">
                            <div className="flex items-center gap-2 justify-center text-[#5060D7]">
                                <span>🔒</span>
                                <span>REQUIRED for Zone 4</span>
                            </div>
                            <div className="flex items-center gap-2 justify-center text-yellow-400">
                                <span>⚡</span>
                                <span>Highest Epic Chance</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => handlePurchase(BaitType.Epic)}
                            disabled={isGlobalLoading}
                            className={`w-full !rounded-full !h-12 !text-base shadow-[0_4px_20px_rgba(80,96,215,0.4)] mt-auto
                                ${purchasingType === BaitType.Epic ? '!bg-[#4B40D0] animate-pulse' : '!bg-[#5060D7] hover:!bg-[#4351B5]'}
                            `}
                        >
                            {getButtonText(BaitType.Epic)}
                        </Button>
                    </div>

                </div>

                {/* Transaction Status Footer */}
                {(isGlobalLoading || isSuccess) && (
                    <div className={`mt-6 p-3 rounded-xl text-center text-sm font-medium animate-fade-in
                        ${isSuccess ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}
                    `}>
                        {isPending && "Waiting for wallet approval..."}
                        {isConfirming && "Transaction confirming on-chain..."}
                        {isSuccess && "Item purchased successfully! Close and re-open your baits to see it."}
                    </div>
                )}

            </div>
        </div>
    );
}
