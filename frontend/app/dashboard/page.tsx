"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { FishAnimation } from "@/components/FishAnimation"
import { Button } from "@/components/Button"
import { RotateCw } from "lucide-react"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';

export default function Dashboard() {
    // const { isConnected } = useAccount();
    const { disconnect } = useDisconnect();
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
                        <ConnectButton.Custom>
                            {({
                                account,
                                chain,
                                openChainModal,
                                openConnectModal,
                                authenticationStatus,
                                mounted,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            }: any) => {
                                const ready = mounted && authenticationStatus !== 'loading';
                                const connected =
                                    ready &&
                                    account &&
                                    chain &&
                                    (!authenticationStatus ||
                                        authenticationStatus === 'authenticated');

                                return (
                                    <div
                                        {...(!ready && {
                                            'aria-hidden': true,
                                            'style': {
                                                opacity: 0,
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                            },
                                        })}
                                    >
                                        {(() => {
                                            if (!connected) {
                                                return (
                                                    <Button
                                                        onClick={openConnectModal}
                                                        variant="primary"
                                                        className={`
                                                            bg-[#5448E8] hover:bg-[#4839d3] transition-all duration-500 shadow-lg shadow-indigo-500/20
                                                            ${isScrolled ? '!h-11 !text-sm !px-6 !rounded-full' : '!h-12 !text-base !px-8'}
                                                        `}
                                                    >
                                                        Connect Wallet
                                                    </Button>
                                                );
                                            }

                                            if (chain.unsupported) {
                                                return (
                                                    <Button
                                                        onClick={openChainModal}
                                                        variant="primary"
                                                        className={`
                                                            bg-red-500 hover:bg-red-600 transition-all duration-500 shadow-lg shadow-red-500/20
                                                            ${isScrolled ? '!h-11 !text-sm !px-6 !rounded-full' : '!h-12 !text-base !px-8'}
                                                        `}
                                                    >
                                                        Wrong Network
                                                    </Button>
                                                );
                                            }

                                            return (
                                                <div className="flex items-center gap-3">
                                                    {/* Connected Status */}
                                                    <div className={`
                                                        flex items-center gap-2.5 rounded-full border border-[#3B9CAD]/30 bg-[#136C7D]/80 text-white font-medium shadow-lg shadow-teal-900/20
                                                        ${isScrolled ? 'h-11 px-5 text-sm' : 'h-12 px-7 text-base'}
                                                    `}>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#00A34D] ring-1 ring-white/90 shadow-[0_0_8px_rgba(0,163,77,0.5)]" />
                                                        Connected
                                                    </div>

                                                    {/* Disconnect Button */}
                                                    <button
                                                        onClick={() => disconnect()}
                                                        className={`
                                                            flex items-center justify-center rounded-full text-white font-medium transition-all
                                                            bg-[#7B617E]/90 border border-white/15 hover:bg-[#7B617E] shadow-lg shadow-purple-900/10
                                                            ${isScrolled ? 'h-11 px-7 text-sm' : 'h-12 px-9 text-base'}
                                                        `}
                                                    >
                                                        Disconnect
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            }}
                        </ConnectButton.Custom>
                    </div>
                </nav>

                {/* Welcome Section */}
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-normal text-white mb-2 drop-shadow-lg">
                        Welcome to Fish It
                    </h1>
                    <p className="text-white/50 text-base md:text-lg max-w-2xl mb-6">
                        Stake MNT, catch unique AI-generated fish NFTs, and boost your real yield.
                    </p>

                    {/* Stake MNT Banner */}
                    <div className="relative overflow-hidden rounded-3xl px-8 py-5 bg-[#4157E2] border border-white/20 shadow-[0_8px_40px_rgba(65,87,226,0.6)]">
                        <div className="relative z-10 flex items-center justify-between gap-6">
                            <div className="flex-1">
                                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                                    Stake MNT to Start Fishing!
                                </h2>
                                <p className="text-white/80 text-sm">
                                    Earn energy every day and catch unique fish NFTs with real yield boosts.
                                </p>
                            </div>
                            <button className="flex-shrink-0 px-8 py-3 bg-white text-[#4157E2] font-semibold text-sm rounded-full hover:bg-white/95 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_12px_rgba(255,255,255,0.3)]">
                                Stake Now
                            </button>
                        </div>

                        {/* Decorative fish icons */}
                        <div className="absolute right-28 top-1/2 -translate-y-1/2 opacity-25">
                            <span className="text-3xl">🐠</span>
                        </div>
                        <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-20">
                            <span className="text-2xl">🐟</span>
                        </div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-15">
                            <span className="text-xl">🐟</span>
                        </div>
                    </div>
                </header>

                {/* Dashboard Grid */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">

                    {/* Left Column: Stats (30%) -> span 4/12 */}
                    <aside className="lg:col-span-3 flex flex-col gap-4">

                        {/* Card: Energy */}
                        <div className="relative h-[214px] overflow-hidden rounded-2xl p-6 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)]">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">

                                    <Image src="/icons/energy-icon.webp" alt="Energy" width={48} height={48} className="w-12 h-12 object-contain" />

                                    <span className="text-2xl font-medium text-white">Your Energy</span>
                                </div>
                                <div className="text-5xl font-semibold text-white tracking-tight mb-1">
                                    25
                                </div>
                                <div className="text-sm text-gray-400">Energy</div>
                            </div>
                        </div>

                        {/* Card: Collection */}
                        <div className="relative h-[214px] overflow-hidden rounded-2xl p-6 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)]">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">

                                    <Image src="/icons/collection-icon.webp" alt="Collection" width={48} height={48} className="w-12 h-12 object-contain" />

                                    <span className="text-2xl font-medium text-white">Collection</span>
                                </div>
                                <div className="text-5xl font-semibold text-white tracking-tight mb-1">
                                    0
                                </div>
                                <div className="text-sm text-gray-400">Fish Collection</div>
                            </div>
                        </div>

                        {/* Card: Token */}
                        <div className="relative h-[214px] overflow-hidden rounded-2xl p-6 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)]">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">

                                    <Image src="/icons/token-icon.webp" alt="Token" width={48} height={48} className="w-12 h-12 object-contain" />

                                    <span className="text-2xl font-medium text-white">Token</span>
                                </div>
                                <div className="text-5xl font-semibold text-white tracking-tight mb-1">
                                    0
                                </div>
                                <div className="text-sm text-gray-400">MNT</div>
                            </div>
                        </div>

                    </aside>

                    {/* Right Column: Aquarium (70%) -> span 8/12 */}
                    <section className="lg:col-span-9 flex flex-col">
                        <div className="relative flex-1 flex flex-col overflow-hidden rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.30)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.50)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.30)] min-h-[500px]">
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
                                    <Image src="/icons/wallet-icon.webp" alt="Connect Wallet" width={96} height={96} className="object-contain drop-shadow-xl opacity-90" />
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
