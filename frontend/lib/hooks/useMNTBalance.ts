'use client';

import { useBalance, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { mantleSepoliaTestnet } from 'wagmi/chains';

/**
 * Hook to get user's native MNT token balance
 * @returns balance data, loading state, and refetch function
 */
export function useMNTBalance() {
    const { address, isConnected } = useAccount();

    const { data, isLoading, error, refetch } = useBalance({
        address,
        chainId: mantleSepoliaTestnet.id, // Explicit chain ID
        query: {
            enabled: isConnected && !!address,
            staleTime: 30_000,       // Data valid for 30 seconds
            gcTime: 5 * 60 * 1000,   // Keep in cache for 5 minutes
        },
    });

    return {
        /** Raw balance in wei (bigint) */
        balanceWei: data?.value ?? 0n,
        /** Formatted balance (string with decimals) */
        balanceFormatted: data?.formatted ?? '0',
        /** Balance as number (for display) */
        balanceNumber: data ? parseFloat(formatEther(data.value)) : 0,
        /** Symbol (MNT) */
        symbol: data?.symbol ?? 'MNT',
        /** Loading state */
        isLoading,
        /** Error if any */
        error,
        /** Refetch function */
        refetch,
    };
}
