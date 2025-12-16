'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navigation() {
    return (
        <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-lg flex items-center justify-center">
                        🐟
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">FishIt</span>
                </Link>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
                        <Link href="/dashboard" className="hover:text-white transition-colors">Play</Link>
                        <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
                        <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
                    </div>

                    <ConnectButton
                        chainStatus="icon"
                        showBalance={false}
                        accountStatus={{
                            smallScreen: 'avatar',
                            largeScreen: 'full',
                        }}
                    />
                </div>
            </div>
        </nav>
    );
}
