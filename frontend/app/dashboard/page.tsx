"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { FishAnimation } from "@/components/FishAnimation"
import { Button } from "@/components/Button"
import { Zap, Fish, Coins, RotateCw, Wallet } from "lucide-react"

export default function Dashboard() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#0D1936] text-white font-sans selection:bg-cyan-500/30">

            {/* --- Background Layers --- */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/bg-1.webp"
                    alt="Underwater Background"
                    fill
                    priority
                    className="object-cover object-center"
                    quality={100}
                />


                {/* Animated Fish Background */}
                <FishAnimation />
            </div>

            {/* --- Content Content --- */}
            <div className="relative z-10 flex flex-col min-h-screen px-6 pt-32 pb-6 md:px-10 lg:px-14 max-w-[1920px] mx-auto">

                {/* Navbar - Dynamic Shrinking & Sticky */}
                <nav
                    className={`
                        fixed z-50 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] left-1/2 -translate-x-1/2
                        ${isScrolled
                            ? 'top-6 w-[95%] max-w-[1200px] px-4 py-3 rounded-full bg-[#283778]/35 backdrop-blur-xl border border-white/20 shadow-lg bg-[linear-gradient(90deg, rgba(92,100,204,0.9)_0%, rgba(92,100,204,0)_30%, rgba(92,100,204,0)_70%, rgba(92,100,204,0.9)_100%)]'
                            : 'top-0 w-full max-w-full px-6 md:px-12 py-6 bg-transparent border-b border-transparent'
                        }
                    `}
                >
                    {/* Left: Logo */}
                    <Link href="/" className="block relative flex-shrink-0 transition-all group z-20 pl-2">
                        <div className={`relative transition-all duration-500 ${isScrolled ? 'w-28 h-9' : 'w-32 md:w-40 h-10'}`}>
                            <Image
                                src="/images/logo-name.webp"
                                alt="Fish It"
                                fill
                                className="object-contain object-left group-hover:opacity-90 transition-opacity"
                                priority
                            />
                        </div>
                    </Link>

                    {/* Center: Main Navigation (Persistent) */}
                    <div
                        className={`
                            absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center p-1.5 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] backdrop-blur-xl border border-white/20 ring-1 ring-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-500 z-10
                            ${isScrolled ? 'scale-100' : 'scale-100'}
                        `}
                    >
                        {/* Active Button with Glow & Depth */}
                        <button className="px-8 py-2.5 rounded-full text-sm font-medium bg-[#5448E8] text-white shadow-[0_2px_20px_rgba(84,72,232,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all z-10">
                            Fishing
                        </button>

                        {/* Inactive Button */}
                        <button className="px-8 py-2.5 rounded-full text-sm font-medium text-white hover:text-white/80 transition-all hover:bg-white/5">
                            Marketplace
                        </button>
                    </div>

                    {/* Right Group: Wallet Only */}
                    <div className="flex items-center gap-4 z-20 pr-1">
                        <Button
                            variant="primary"
                            className={`
                                bg-[#5448E8] hover:bg-[#4839d3] transition-all duration-500 shadow-lg shadow-indigo-500/20
                                ${isScrolled ? '!h-11 !text-sm !px-6 !rounded-full' : '!h-12 !text-base !px-8'}
                            `}
                        >
                            Connect Wallet
                        </Button>
                    </div>
                </nav>

                {/* Welcome Section */}
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-normal text-white mb-2 drop-shadow-lg">
                        Welcome to Fish It
                    </h1>
                    <p className="text-white/50 text-base md:text-lg max-w-2xl">
                        Stake MNT, catch unique AI-generated fish NFTs, and boost your real yield.
                    </p>
                </header>

                {/* Dashboard Grid */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">

                    {/* Left Column: Stats (30%) -> span 4/12 */}
                    <aside className="lg:col-span-3 flex flex-col gap-4">

                        {/* Card: Energy */}
                        <div className="relative overflow-hidden bg-[rgba(17,34,71,0.85)] backdrop-blur-[8px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.2),0_0_20px_rgba(79,127,255,0.2)]">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-full bg-white/5">
                                        <Zap className="w-5 h-5 text-purple-400 fill-purple-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white">Your Energy</span>
                                </div>
                                <div className="text-5xl font-bold text-white tracking-tight mb-1">
                                    25
                                </div>
                                <div className="text-sm text-gray-400">Energy</div>
                            </div>
                        </div>

                        {/* Card: Collection */}
                        <div className="relative overflow-hidden bg-[rgba(17,34,71,0.85)] backdrop-blur-[8px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.2),0_0_20px_rgba(79,127,255,0.2)]">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-full bg-white/5">
                                        <Fish className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white">Collection</span>
                                </div>
                                <div className="text-5xl font-bold text-white tracking-tight mb-1">
                                    0
                                </div>
                                <div className="text-sm text-gray-400">Fish Collection</div>
                            </div>
                        </div>

                        {/* Card: Token */}
                        <div className="relative overflow-hidden bg-[rgba(17,34,71,0.85)] backdrop-blur-[8px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.2),0_0_20px_rgba(79,127,255,0.2)]">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-full bg-white/5">
                                        <Coins className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white">Token</span>
                                </div>
                                <div className="text-5xl font-bold text-white tracking-tight mb-1">
                                    0
                                </div>
                                <div className="text-sm text-gray-400">MNT</div>
                            </div>
                        </div>

                    </aside>

                    {/* Right Column: Aquarium (70%) -> span 8/12 */}
                    <section className="lg:col-span-9 flex flex-col">
                        <div className="relative flex-1 flex flex-col bg-[rgba(17,34,71,0.85)] backdrop-blur-[8px] border border-white/15 rounded-2xl p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.2),0_0_20px_rgba(79,127,255,0.2)] overflow-hidden min-h-[500px]">

                            {/* Header */}
                            <div className="flex items-center justify-between mb-8 z-10">
                                <h2 className="text-xl md:text-2xl font-normal text-white">My Aquarium</h2>

                                <div className="flex items-center gap-4">
                                    <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10">
                                        <RotateCw className="w-5 h-5" />
                                    </button>

                                    <button className="px-8 py-3 rounded-full bg-[#5A3BCE] hover:bg-[#4c32b3] text-white font-medium transition-all shadow-lg shadow-indigo-500/20">
                                        Cast Line
                                    </button>
                                </div>
                            </div>

                            {/* Empty State Content */}
                            <div className="flex-1 flex flex-col items-center justify-center text-center z-10 relative">

                                {/* 3D Wallet / Placeholder Icon */}
                                <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                                    {/* Using Lucide Wallet as main focal point */}
                                    <Wallet className="w-16 h-16 text-blue-300/80 drop-shadow-xl" strokeWidth={1} />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">
                                    Connect Your Wallet First
                                </h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    Stake at least 1 MNT to unlock Energy and access the fishing gameplay.
                                </p>

                            </div>
                        </div>
                    </section>

                </main>
            </div>
        </div>
    )
}
