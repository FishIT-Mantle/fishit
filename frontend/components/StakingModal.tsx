"use client";

import { useState } from "react";
import Image from "next/image";

interface StakingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function StakingModal({ isOpen, onClose }: StakingModalProps) {
    const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
    const [stakeAmount, setStakeAmount] = useState("");

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[#0D1936]/80 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
                className="relative z-10 w-full max-w-[500px] rounded-[32px] overflow-hidden backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="text-lg font-normal text-white">Stake to Upgrade Fishing License</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
                    >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Tier Selection */}
                    <div className="rounded-[20px] border border-[#5C64CC] p-5 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)]">
                        <p className="text-center text-[#ddd] text-xs mb-3 font-normal">Select Target Tier:</p>
                        <div className="flex gap-3 justify-center">
                            {[
                                { tier: 1, price: 100, label: "Tier I", image: "/badges/tier-1-badges.webp" },
                                { tier: 2, price: 250, label: "Tier II", image: "/badges/tier-2-badges.webp" },
                                { tier: 3, price: 500, label: "Tier III", image: "/badges/tier-3-badges.webp" },
                            ].map((item) => (
                                <div
                                    key={item.tier}
                                    onClick={() => {
                                        setSelectedTier(item.tier as 1 | 2 | 3);
                                        setStakeAmount(item.price.toString());
                                    }}
                                    className={`
                                        relative w-24 h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                                        group border
                                        ${selectedTier === item.tier
                                            ? "bg-gradient-to-b from-[#5448E8]/20 to-transparent border-[1.5px] border-[#7F80F8] shadow-[0_0_20px_rgba(84,72,232,0.5),inset_0_0_15px_rgba(84,72,232,0.2)]"
                                            : "bg-[#1E2546]/40 border-white/5 hover:border-[#5448E8]/50 hover:bg-[#5448E8]/10 hover:shadow-[0_0_15px_rgba(84,72,232,0.3)]"
                                        }
                                    `}
                                >
                                    {/* Inner Glow for Selected State */}
                                    {selectedTier === item.tier && (
                                        <div className="absolute inset-0 rounded-xl bg-[#5448E8]/10 blur-md -z-10" />
                                    )}

                                    <div className={`w-12 h-12 mb-2 relative transition-transform duration-300 ${selectedTier === item.tier ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'grayscale-[0.3] group-hover:scale-105 group-hover:grayscale-0'}`}>
                                        <Image src={item.image} alt={item.label} fill className="object-contain" />
                                    </div>
                                    <p className={`text-xs font-medium mb-0.5 ${selectedTier === item.tier ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{item.label}</p>
                                    <p className="text-[10px] text-white/50 group-hover:text-white/70">({item.price} MNT)</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="rounded-[20px] border border-[#5C64CC] p-5 space-y-3 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)]">
                        <div>
                            <label className="block text-[#ddd] text-xs mb-2 font-normal">Amount of Stake<span className="text-[#FF6467]">*</span></label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    placeholder="(Example: 1)"
                                    className="w-full h-[46px] rounded-[14px] border border-[#5C64CC] bg-gradient-to-b from-[#05153F]/0 to-[#05153F]/40 px-4 text-sm text-white placeholder:text-[#AAA] focus:outline-none focus:border-[#7F80F8] transition-all appearance-none"
                                />
                                {/* Custom Selector Icons */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-[2px]">
                                    <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[4.5px] border-b-white/80 cursor-pointer hover:border-b-white transition-colors"></div>
                                    <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4.5px] border-t-white/80 cursor-pointer hover:border-t-white transition-colors"></div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-[#5C64CC]/50" />

                        <div className="flex justify-between items-center">
                            <span className="text-[#ddd] text-sm">Total Amount:</span>
                            <span className="text-lg font-bold text-white tracking-wide">{stakeAmount ? stakeAmount : "0"} MNT</span>
                        </div>
                    </div>

                    {/* Benefit Preview (Conditional) */}
                    {stakeAmount && parseInt(stakeAmount) >= 100 && (
                        <div className="relative rounded-[16px] p-[1px] shadow-[0_0_25px_rgba(107,235,238,0.25)]">
                            <div className="absolute inset-0 rounded-[16px] bg-[#6BEBEE] opacity-60 blur-sm"></div>
                            <div className="relative z-10 rounded-[15px] bg-[#0A102A]/80 border border-[#6BEBEE]/80 p-3 flex flex-col items-center justify-center gap-1 backdrop-blur-md">
                                <p className="text-[#AAA] text-[10px] font-medium uppercase tracking-wider">Benefit Preview</p>
                                <div className="flex items-center gap-2 text-[#6BEBEE] drop-shadow-[0_0_10px_rgba(107,235,238,0.6)]">
                                    <div className="p-1 rounded bg-[#6BEBEE]/20">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 10 0v2h1zm-6-5a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold tracking-wide shadow-cyan-500/50">Unlocks: Reef Zone</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Warning & Button */}
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-center gap-2 text-[#FFC107] text-xs font-medium">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L1 21h22L12 2zm0 3.45l8.28 14.3H3.72L12 5.45zM11 10v6h2v-6h-2zm0 8v2h2v-2h-2z" />
                            </svg>
                            <span>Unstake cooldown: <span className="text-[#FFC107] font-bold">3 Days</span></span>
                        </div>

                        <button
                            disabled={!stakeAmount || parseInt(stakeAmount) <= 0}
                            className={`
                                w-full h-12 rounded-full font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300
                                ${stakeAmount && parseInt(stakeAmount) > 0
                                    ? "bg-[#5448E8] hover:bg-[#4B40D0] text-white shadow-[0_4px_20px_rgba(84,72,232,0.4)] hover:shadow-[0_6px_25px_rgba(84,72,232,0.6)] transform hover:-translate-y-0.5"
                                    : "bg-[#1E2546] border border-[#2D365F] text-white/50 cursor-not-allowed"
                                }
                            `}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                            Stake & Upgrade License
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
