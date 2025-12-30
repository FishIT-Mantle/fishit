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
    const [showShopModal, setShowShopModal] = useState(false);
    const [showStakeModal, setShowStakeModal] = useState(false);
    const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
    const [stakeAmount, setStakeAmount] = useState("");

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
                        <div className="relative overflow-hidden rounded-3xl p-4 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)] lg:w-[320px] xl:w-[380px] flex-shrink-0 min-h-[200px]">
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-3">
                                    <Image src="/icons/collection-icon.webp" alt="Bait Supply" width={40} height={40} className="w-10 h-10 object-contain" />
                                    <span className="text-lg font-medium text-white">My Bait Supply</span>
                                </div>
                                <div className="flex-1 flex flex-col w-full h-full">
                                    {isConnected ? (
                                        <>
                                            <div className="flex flex-col gap-2.5 mb-auto">
                                                {/* Common Bait */}
                                                <div className="relative overflow-hidden rounded-3xl py-2.5 pl-2.5 pr-5 backdrop-blur-md bg-gradient-to-r from-[#3a4a8a]/50 to-[#4a5a9a]/30 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.15)] flex items-center gap-3">
                                                    <Image src="/bait/common-bait.webp" alt="Common Bait" width={48} height={48} className="w-12 h-12 object-contain shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-base font-medium leading-tight truncate">Common Worm Bait</p>
                                                        <p className="text-white/70 text-xs leading-tight">Legendary Fish Chance: 0.5%</p>
                                                    </div>
                                                    <span className="text-white text-base font-semibold shrink-0">x12</span>
                                                </div>

                                                {/* Rare Bait */}
                                                <div className="relative overflow-hidden rounded-3xl py-2.5 pl-2.5 pr-5 backdrop-blur-md bg-gradient-to-r from-[#3a4a8a]/50 to-[#4a5a9a]/30 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.15)] flex items-center gap-3">
                                                    <Image src="/bait/rare-bait.webp" alt="Rare Bait" width={48} height={48} className="w-12 h-12 object-contain shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-base font-medium leading-tight truncate">Rare Lure Bait</p>
                                                        <p className="text-white/70 text-xs leading-tight">Legendary Fish Chance: 5%</p>
                                                    </div>
                                                    <span className="text-white text-base font-semibold shrink-0">x12</span>
                                                </div>

                                                {/* Epic Bait */}
                                                <div className="relative overflow-hidden rounded-3xl py-2.5 pl-2.5 pr-5 backdrop-blur-md bg-gradient-to-r from-[#3a4a8a]/50 to-[#4a5a9a]/30 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.15)] flex items-center gap-3">
                                                    <Image src="/bait/epic-bait.webp" alt="Epic Bait" width={48} height={48} className="w-12 h-12 object-contain shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-base font-medium leading-tight truncate">Epic Gold Bait</p>
                                                        <p className="text-white/70 text-xs leading-tight">Legendary Fish Chance: 5%</p>
                                                    </div>
                                                    <span className="text-white text-base font-semibold shrink-0">x12</span>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => setShowShopModal(true)}
                                                className="w-full !bg-[#5448E8] !text-white hover:!bg-[#4B40D0] !h-11 !rounded-full !text-sm !font-medium shadow-lg mt-4 shrink-0"
                                            >
                                                Shop Baits
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center">
                                            <p className="text-white/50 text-sm">(No bait available)</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: 3 Cards + Staking Banner */}
                        <div className="flex-1 flex flex-col gap-4">
                            {/* 3 Cards Row */}
                            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                {/* Card: My License Status */}
                                <div className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)] sm:w-[286px] shrink-0">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Image src="/icons/energy-icon.webp" alt="License Status" width={40} height={40} className="w-10 h-10 object-contain" />
                                            <span className="text-lg font-medium text-white">My License Status</span>
                                        </div>
                                        {isConnected ? (
                                            <div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <p className="text-[56px] leading-none font-medium text-white">Tier I</p>
                                                    <div className="relative w-12 h-12">
                                                        <svg className="w-full h-full" viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M23.5 0L30.5 8.5L40.5 10.5L43.5 20.5L35.5 28.5L36.5 38.5L23.5 47L10.5 38.5L11.5 28.5L3.5 20.5L6.5 10.5L16.5 8.5L23.5 0Z" fill="url(#hexGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                                                            <defs>
                                                                <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                    <stop offset="0%" stopColor="#6D006F" stopOpacity="1" />
                                                                    <stop offset="100%" stopColor="#4157E2" stopOpacity="1" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <p className="text-white/70 text-sm mb-3">You are now at zone:</p>
                                                <div className="inline-flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-[#5448E8] to-[#8B5CF6] text-white text-sm font-medium shadow-lg">
                                                    Zone 2 - Reef Zone
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-white/50 text-sm">(Status not available)</p>
                                        )}
                                    </div>
                                </div>

                                {/* Card: My Fish Collection */}
                                <div className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)] flex-1">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Image src="/icons/fish-icon.webp" alt="Fish Collection" width={40} height={40} className="w-10 h-10 object-contain" />
                                            <span className="text-lg font-medium text-white">My Fish Collection</span>
                                        </div>
                                        {isConnected ? (
                                            <div>
                                                <p className="text-[56px] leading-none font-medium text-white mb-6">0</p>
                                                <p className="text-white/70 text-base mb-2">Fish</p>
                                                <div className="flex flex-nowrap gap-2">
                                                    <span className="px-3 py-1.5 rounded-full bg-gradient-to-b from-[#ffffff]/30 to-[#ffffff]/10 border border-white/30 backdrop-blur-md text-white text-xs font-medium whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">Common: 0</span>
                                                    <span className="px-3 py-1.5 rounded-full bg-gradient-to-b from-[#5060D7]/50 to-[#5060D7]/25 border border-[#818CF8]/50 backdrop-blur-md text-white text-xs font-medium whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">Rare: 0</span>
                                                    <span className="px-3 py-1.5 rounded-full bg-gradient-to-b from-[#6BEBEE]/50 to-[#6BEBEE]/25 border border-[#22D3EE]/50 backdrop-blur-md text-white text-xs font-medium whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">Epic: 0</span>
                                                    <span className="px-3 py-1.5 rounded-full bg-gradient-to-b from-[#BD915B]/40 to-[#785A35]/20 border border-[#F59E0B]/50 backdrop-blur-md text-white text-xs font-medium whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Legendary: 0</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-white/50 text-sm">(No fish available)</p>
                                        )}
                                    </div>
                                </div>

                                {/* Card: MNT Token */}
                                <div className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)] sm:w-[236px] shrink-0">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Image src="/icons/token-icon.webp" alt="MNT Token" width={40} height={40} className="w-10 h-10 object-contain" />
                                            <span className="text-lg font-medium text-white">MNT Token</span>
                                        </div>
                                        {isConnected ? (
                                            <div>
                                                <p className="text-[56px] leading-none font-medium text-white mb-1">250</p>
                                                <p className="text-white/70 text-base">MNT</p>
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
                                            onClick={() => setShowStakeModal(true)}
                                            className="!bg-white !text-[#4157E2] hover:!bg-white/90 !border-none !h-10 !px-8 !text-base !font-semibold shadow-lg"
                                        >
                                            Stake Now
                                        </Button>
                                    ) : (
                                        <button
                                            onClick={() => setShowStakeModal(true)}
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

            {/* Shop Baits Modal */}
            {showShopModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowShopModal(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-[#0D1936]/80 backdrop-blur-sm" />

                    {/* Modal Content */}
                    <div
                        className="relative z-10 w-full max-w-4xl p-8 rounded-[32px] bg-gradient-to-b from-[#1C2C65] to-[#0F1A3E] border border-white/20 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-semibold text-white">Baits Shop</h2>
                            <button
                                onClick={() => setShowShopModal(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/20"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Baits Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Common Bait Card */}
                            <div className="relative rounded-3xl p-6 border border-[#5060D7]/30 bg-[radial-gradient(circle_at_center,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)] flex flex-col items-center text-center group hover:border-[#5060D7]/60 transition-all">
                                <div className="w-24 h-24 mb-4 relative drop-shadow-[0_4px_24px_rgba(80,96,215,0.4)]">
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
                                        <span>High Junk Change</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center text-yellow-400">
                                        <span>⚠️</span>
                                        <span>Cannot Enter Zone 4</span>
                                    </div>
                                </div>

                                <Button className="w-full !rounded-full !bg-[#5060D7] hover:!bg-[#4351B5] !h-12 !text-base shadow-[0_4px_20px_rgba(80,96,215,0.4)] mt-auto">
                                    Purchase
                                </Button>
                            </div>

                            {/* Rare Bait Card */}
                            <div className="relative rounded-3xl p-6 border border-[#5060D7]/30 bg-[radial-gradient(circle_at_center,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)] flex flex-col items-center text-center group hover:border-[#5060D7]/60 transition-all">
                                <div className="w-24 h-24 mb-4 relative drop-shadow-[0_4px_24px_rgba(80,96,215,0.4)]">
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
                                    <div className="flex items-center gap-2 justify-center text-yellow-400">
                                        <span>⚠️</span>
                                        <span>Cannot Enter Zone 4</span>
                                    </div>
                                </div>

                                <Button className="w-full !rounded-full !bg-[#5060D7] hover:!bg-[#4351B5] !h-12 !text-base shadow-[0_4px_20px_rgba(80,96,215,0.4)] mt-auto">
                                    Purchase
                                </Button>
                            </div>

                            {/* Epic Bait Card */}
                            <div className="relative rounded-3xl p-6 border border-[#5060D7]/30 bg-[radial-gradient(circle_at_center,rgba(80,96,215,0.3)_0%,rgba(80,96,215,0.1)_100%)] flex flex-col items-center text-center group hover:border-[#5060D7]/60 transition-all">
                                <div className="w-24 h-24 mb-4 relative drop-shadow-[0_4px_24px_rgba(80,96,215,0.4)]">
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
                                        <span>REQUIRED for Zone 4 (Abyssal)</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center">
                                        <span>🔥</span>
                                        <span>High Risk, High Reward</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center text-yellow-400">
                                        <span>⚡</span>
                                        <span>Highest Epic Fish Chance</span>
                                    </div>
                                </div>

                                <Button className="w-full !rounded-full !bg-[#5060D7] hover:!bg-[#4351B5] !h-12 !text-base shadow-[0_4px_20px_rgba(80,96,215,0.4)] mt-auto">
                                    Purchase
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Stake Modal */}
            {
                showStakeModal && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowStakeModal(false)}
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
                                    onClick={() => setShowStakeModal(false)}
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
                )
            }
        </div >
    )
}

