'use client';

import { useState } from 'react';

export function StakingPanel() {
    const [amount, setAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');

    // Helpers for calculation based on PRD: Energy = sqrt(amount)
    const calculateEnergy = (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) return 0;
        return Math.sqrt(num).toFixed(2);
    };

    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Staking Vault</h2>
                <div className="text-sm text-cyan-400 bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-500/20">
                    ~4.5% APY
                </div>
            </div>

            <div className="flex p-1 bg-black/40 rounded-lg mb-6">
                <button
                    onClick={() => setActiveTab('stake')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stake'
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                >
                    Stake MNT
                </button>
                <button
                    onClick={() => setActiveTab('unstake')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'unstake'
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                >
                    Unstake
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                        Amount ({activeTab === 'stake' ? 'Deposit' : 'Withdraw'})
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                            MNT
                        </span>
                    </div>
                </div>

                {activeTab === 'stake' && (
                    <div className="bg-gradient-to-r from-cyan-900/10 to-blue-900/10 border border-cyan-500/10 rounded-xl p-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-zinc-400">Daily Energy</span>
                            <span className="font-mono text-cyan-300 font-bold">
                                +{calculateEnergy(amount)} ⚡
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Based on √Stake formula
                        </p>
                    </div>
                )}

                <button className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {activeTab === 'stake' ? 'Confirm Stake' : 'Confirm Unstake'}
                </button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs text-zinc-500 mb-1">My Stake</div>
                    <div className="text-lg font-mono text-white">0.00 MNT</div>
                </div>
                <div>
                    <div className="text-xs text-zinc-500 mb-1">Earned Yield</div>
                    <div className="text-lg font-mono text-green-400">0.00 MNT</div>
                </div>
            </div>
        </div>
    );
}
