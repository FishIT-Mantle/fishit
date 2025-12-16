"use client"

import Image from "next/image"
import Link from "next/link"
import { FishAnimation } from "@/components/FishAnimation"
import { Zap, Fish, Coins, RotateCw, Wallet } from "lucide-react"

export default function Dashboard() {
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
                {/* Dark Overlay for Readability */}
                <div className="absolute inset-0 bg-[#0D1936]/80 mix-blend-multiply" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1936] via-transparent to-[#0D1936]/40" />

                {/* Animated Fish Background */}
                <FishAnimation />
            </div>

            {/* --- Content Content --- */}
            <div className="relative z-10 flex flex-col min-h-screen px-6 py-6 md:px-10 lg:px-14 max-w-[1920px] mx-auto">

                {/* Navbar */}
                <nav className="flex flex-wrap items-center justify-between gap-4 mb-10">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0">
                        <div className="relative h-12 w-40">
                            <Image
                                src="/images/logo-name.webp"
                                alt="Fish It"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>

                    {/* Navigation Pills */}
                    <div className="flex items-center p-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                        <button className="px-6 py-2 rounded-full text-sm font-medium bg-[#5A3BCE] text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105">
                            Fishing
                        </button>
                        <button className="px-6 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all hover:bg-white/5">
                            Marketplace
                        </button>
                    </div>

                    {/* Connect Wallet */}
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5A3BCE] hover:bg-[#4c32b3] text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95">
                        Connect Wallet
                    </button>
                </nav>

                {/* Welcome Section */}
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                        Welcome to Fish It
                    </h1>
                    <p className="text-blue-100/80 text-base md:text-lg max-w-2xl">
                        Stake MNT, catch unique AI-generated fish NFTs, and boost your real yield.
                    </p>
                </header>

                {/* Dashboard Grid */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">

                    {/* Left Column: Stats (30%) -> span 4/12 */}
                    <aside className="lg:col-span-3 flex flex-col gap-4">

                        {/* Card: Energy */}
                        <div className="relative overflow-hidden group bg-[#112247]/90 backdrop-blur-sm border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:border-white/10 hover:shadow-cyan-500/10">
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-50" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-full bg-white/5">
                                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    </div>
                                    <span className="text-sm font-medium text-blue-100/70">Your Energy</span>
                                </div>
                                <div className="text-5xl font-bold text-white tracking-tight mb-1">
                                    25
                                </div>
                                <div className="text-sm text-blue-200/50">Energy</div>
                            </div>
                        </div>

                        {/* Card: Collection */}
                        <div className="relative overflow-hidden group bg-[#112247]/90 backdrop-blur-sm border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:border-white/10 hover:shadow-cyan-500/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-full bg-white/5">
                                        <Fish className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <span className="text-sm font-medium text-blue-100/70">Collection</span>
                                </div>
                                <div className="text-5xl font-bold text-white tracking-tight mb-1">
                                    0
                                </div>
                                <div className="text-sm text-blue-200/50">Fish Collection</div>
                            </div>
                        </div>

                        {/* Card: Token */}
                        <div className="relative overflow-hidden group bg-[#112247]/90 backdrop-blur-sm border border-white/5 rounded-2xl p-6 shadow-xl transition-all hover:border-white/10 hover:shadow-cyan-500/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-50" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-full bg-white/5">
                                        <Coins className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <span className="text-sm font-medium text-blue-100/70">Token</span>
                                </div>
                                <div className="text-5xl font-bold text-white tracking-tight mb-1">
                                    0
                                </div>
                                <div className="text-sm text-blue-200/50">MNT</div>
                            </div>
                        </div>

                    </aside>

                    {/* Right Column: Aquarium (70%) -> span 8/12 */}
                    <section className="lg:col-span-9 flex flex-col">
                        <div className="relative flex-1 flex flex-col bg-[#112247]/90 backdrop-blur-sm border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden min-h-[500px]">

                            {/* Header */}
                            <div className="flex items-center justify-between mb-8 z-10">
                                <h2 className="text-xl md:text-2xl font-semibold text-white">My Aquarium</h2>

                                <div className="flex items-center gap-4">
                                    <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all hover:rotate-180 duration-500 border border-white/5">
                                        <RotateCw className="w-5 h-5" />
                                    </button>

                                    <button className="px-8 py-3 rounded-full bg-[#5A3BCE] hover:bg-[#4c32b3] text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
                                        Cast Line
                                    </button>
                                </div>
                            </div>

                            {/* Empty State Content */}
                            <div className="flex-1 flex flex-col items-center justify-center text-center z-10 relative">

                                {/* 3D Wallet / Placeholder Icon */}
                                <div className="relative w-32 h-32 mb-6 group">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full group-hover:bg-blue-500/30 transition-all duration-500" />

                                    {/* Using Lucide Wallet as placeholder for 3D asset */}
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <Wallet className="w-24 h-24 text-blue-300/80 drop-shadow-2xl transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 ease-out" strokeWidth={1} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-3">
                                    Connect Your Wallet First
                                </h3>
                                <p className="text-blue-200/60 max-w-md mx-auto leading-relaxed">
                                    Stake at least 1 MNT to unlock Energy and access the fishing gameplay.
                                </p>

                            </div>

                            {/* Decorative Background Elements inside Card */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

                        </div>
                    </section>

                </main>
            </div>
        </div>
    )
}
