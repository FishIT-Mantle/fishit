"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { FishAnimation } from "@/components/FishAnimation"
import { Button } from "@/components/Button"
import { RotateCw } from "lucide-react"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';

export default function Dashboard() {
    const { isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const [isScrolled, setIsScrolled] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);

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

                        {/* Aquarium Button - NEW */}
                        <button className="px-8 py-2.5 rounded-full text-sm font-medium text-white hover:text-white/80 transition-all hover:bg-white/5">
                            Aquarium
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
                <header className="mb-6">
                    <h1 className="text-3xl md:text-4xl font-normal text-white mb-2 drop-shadow-lg flex items-center gap-3">
                        Welcome to Fish It
                        <span className="text-2xl animate-bounce">🐟</span>
                    </h1>
                    <p className="text-white/50 text-base md:text-lg max-w-6xl">
                        Enter a controlled Web3 fishing economy. Stake for access, manage your resources, and hunt for rare AI NFTs in high-risk zones.
                    </p>
                </header>

                {/* Main Dashboard Content */}
                <main className="flex-1 flex flex-col gap-6 pb-6">

                    {/* Stats Cards Grid - 2 Column Layout */}
                    <div className="flex flex-col lg:flex-row gap-4">

                        {/* Left Column: My Bait Supply (Stretches to match right column height) */}
                        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)] lg:w-[280px] xl:w-[320px] flex-shrink-0 min-h-[200px]">
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <Image src="/icons/collection-icon.webp" alt="Bait Supply" width={40} height={40} className="w-10 h-10 object-contain" />
                                    <span className="text-lg font-medium text-white">My Bait Supply</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center w-full">
                                    <p className="text-white/50 text-sm mb-auto mt-auto">(No bait available)</p>
                                    {isConnected && (
                                        <Button
                                            className="w-full !bg-[#5448E8] !text-white hover:!bg-[#4B40D0] !h-11 !rounded-full !text-sm !font-medium shadow-lg mt-6"
                                        >
                                            Shop Baits
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: 3 Cards + Staking Banner */}
                        <div className="flex-1 flex flex-col gap-4">
                            {/* 3 Cards Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Card: My License Status */}
                                <div className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)]">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Image src="/icons/energy-icon.webp" alt="License Status" width={40} height={40} className="w-10 h-10 object-contain" />
                                            <span className="text-lg font-medium text-white">My License Status</span>
                                        </div>
                                        {isConnected ? (
                                            <div>
                                                <p className="text-[40px] leading-none font-medium text-white mb-2">None</p>
                                                <p className="text-white/70 text-xs mb-3">You are now at zone:</p>
                                                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-[#5448E8] to-[#8B5CF6] text-white text-xs font-medium shadow-md">
                                                    Zone 1 - Shallow Waters
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-white/50 text-sm">(Status not available)</p>
                                        )}
                                    </div>
                                </div>

                                {/* Card: My Fish Collection */}
                                <div className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)]">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Image src="/icons/fish-icon.webp" alt="Fish Collection" width={40} height={40} className="w-10 h-10 object-contain" />
                                            <span className="text-lg font-medium text-white">My Fish Collection</span>
                                        </div>
                                        {isConnected ? (
                                            <div>
                                                <p className="text-[40px] leading-none font-medium text-white mb-1">0</p>
                                                <p className="text-white/70 text-sm mb-4">Fish</p>
                                                <div className="flex flex-wrap xl:flex-nowrap gap-1">
                                                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/20 text-white text-[10px] whitespace-nowrap">Common: 0</span>
                                                    <span className="px-2 py-1 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/50 text-white text-[10px] whitespace-nowrap">Rare: 0</span>
                                                    <span className="px-2 py-1 rounded-full bg-[#06b6d4]/20 border border-[#06b6d4]/50 text-white text-[10px] whitespace-nowrap">Epic: 0</span>
                                                    <span className="px-2 py-1 rounded-full bg-[#94a3b8]/20 border border-[#94a3b8]/50 text-white text-[10px] whitespace-nowrap">Legendary: 0</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-white/50 text-sm">(No fish available)</p>
                                        )}
                                    </div>
                                </div>

                                {/* Card: MNT Token */}
                                <div className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)]">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Image src="/icons/token-icon.webp" alt="MNT Token" width={40} height={40} className="w-10 h-10 object-contain" />
                                            <span className="text-lg font-medium text-white">MNT Token</span>
                                        </div>
                                        {isConnected ? (
                                            <div>
                                                <p className="text-[40px] leading-none font-medium text-white mb-1">250</p>
                                                <p className="text-white/70 text-sm">MNT</p>
                                            </div>
                                        ) : (
                                            <p className="text-white/50 text-sm">(No token available)</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Staking Banner */}
                            <div className="relative overflow-hidden rounded-2xl px-6 py-5 bg-[#4157E2] border border-[#7B83DB]/60 shadow-[0_4px_20px_rgba(91,99,203,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
                                <div className="relative z-10 flex items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-lg md:text-xl font-semibold text-white mb-1">
                                            Unlock Deeper Zones & Better Catches!
                                        </h3>
                                        <p className="text-white/70 text-sm">
                                            Stake MNT to access higher-tier zones, reduce junk rates, and catch rarer fish NFTs.
                                        </p>
                                    </div>

                                    {/* Decorative fish icons */}
                                    <div className="hidden md:flex items-center gap-2 mr-2">
                                        <svg className="w-7 h-7 text-white/30" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 20c4.4 0 8-3.6 8-8s-3.6-8-8-8c-2.5 0-4.8 1.2-6.3 3L2 7l.7 4.3L7 10l-2.4-.4c1.2-1.5 3.1-2.6 5.2-2.6 3.3 0 6 2.7 6 6s-2.7 6-6 6c-1.4 0-2.7-.5-3.8-1.3L4.6 19c1.8 1.3 4 2 6.4 2h1z" />
                                            <ellipse cx="14" cy="11" rx="1" ry="1.2" fill="currentColor" />
                                        </svg>
                                        <svg className="w-5 h-5 text-white/25" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 20c4.4 0 8-3.6 8-8s-3.6-8-8-8c-2.5 0-4.8 1.2-6.3 3L2 7l.7 4.3L7 10l-2.4-.4c1.2-1.5 3.1-2.6 5.2-2.6 3.3 0 6 2.7 6 6s-2.7 6-6 6c-1.4 0-2.7-.5-3.8-1.3L4.6 19c1.8 1.3 4 2 6.4 2h1z" />
                                            <ellipse cx="14" cy="11" rx="1" ry="1.2" fill="currentColor" />
                                        </svg>
                                    </div>

                                    {isConnected ? (
                                        <Button
                                            className="!bg-white !text-[#4157E2] hover:!bg-white/90 !border-none !h-10 !px-8 !text-base !font-semibold shadow-lg"
                                        >
                                            Stake Now
                                        </Button>
                                    ) : (
                                        <button
                                            onClick={() => setShowWalletModal(true)}
                                            className="flex-shrink-0 px-6 py-2.5 rounded-full bg-white/15 border border-white/30 text-white/80 font-medium text-sm backdrop-blur-sm hover:bg-white/20 hover:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                                        >
                                            Stake Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* My Aquarium Section - Full Width */}
                    <section className="w-full flex-1">
                        <div className="relative flex-1 flex flex-col overflow-hidden rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.30)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.50)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.30)] min-h-[400px]">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-8 z-10">
                                <h2 className="text-xl md:text-2xl font-normal text-white">My Aquarium</h2>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => !isConnected && setShowWalletModal(true)}
                                        className={`p-3 rounded-full transition-all ${isConnected
                                            ? "bg-[#5448E8] text-white shadow-[0_2px_20px_rgba(84,72,232,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#4B40D0]"
                                            : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
                                            }`}
                                    >
                                        <RotateCw className="w-5 h-5" />
                                    </button>

                                    {isConnected ? (
                                        <Button
                                            className="!bg-[#5448E8] !text-white !shadow-[0_2px_20px_rgba(84,72,232,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] hover:!bg-[#4B40D0] !border-none !h-11 !px-8 !text-base !font-medium"
                                        >
                                            Go Fishing Zone
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            className="!h-11 !px-6 !text-sm bg-white/10 border border-white/20 text-white/80 hover:bg-white/15"
                                            onClick={() => setShowWalletModal(true)}
                                        >
                                            Go Fishing Zone
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Empty State Content */}
                            <div className="flex-1 flex flex-col items-center justify-center text-center z-10 relative">

                                {/* Fish Icon */}
                                <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                                    <span className="text-5xl opacity-60">🐟</span>
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Your Aquarium is Empty
                                </h3>
                                <p className="text-gray-400 max-w-md mx-auto text-sm">
                                    No fish have been caught yet. Go to the Fishing Zone to start catching fish.
                                </p>

                            </div>
                        </div>
                    </section>

                </main>
            </div>

            {/* Connect Wallet Modal */}
            {showWalletModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    onClick={() => setShowWalletModal(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-[#0D1936]/80 backdrop-blur-sm" />

                    {/* Modal Card */}
                    <div
                        className="relative z-10 w-[90%] max-w-[420px] p-8 rounded-2xl bg-[radial-gradient(120%_120%_at_50%_0%,rgba(60,80,160,0.50)_0%,rgba(30,50,100,0.60)_50%,rgba(15,30,70,0.70)_100%)] border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(80,100,200,0.3)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icon Container */}
                        <div className="flex justify-center mb-6">

                            <Image
                                src="/icons/wallet-icon.webp"
                                alt="Wallet"
                                width={48}
                                height={48}
                                className="w-12 h-12 object-contain"
                            />

                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-semibold text-white text-center mb-2">
                            Connect Your Wallet First
                        </h3>

                        {/* Subtitle */}
                        <p className="text-white/60 text-sm text-center mb-8">
                            You must connect to your wallet to access all features
                        </p>

                        {/* Connect Button */}
                        <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                                <Button
                                    onClick={() => {
                                        setShowWalletModal(false);
                                        openConnectModal();
                                    }}
                                    className="w-full gap-3"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                                        <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4Z" />
                                    </svg>
                                    Connect Wallet
                                </Button>
                            )}
                        </ConnectButton.Custom>
                    </div>
                </div>
            )}
        </div>
    )
}

