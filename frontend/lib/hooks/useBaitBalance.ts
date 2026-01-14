'use client';

import { useReadContracts, useAccount } from 'wagmi';
import { BAIT_ADDRESS, BAIT_ABI } from '../contracts';

/**
 * Bait types enum matching smart contract
 */
export enum BaitType {
    Common = 0,
    Rare = 1,
    Epic = 2,
}

/**
 * Hook to get user's bait balances for all types
 * @returns bait balances, loading state, and refetch function
 */
export function useBaitBalance() {
    const { address, isConnected } = useAccount();

    const { data, isLoading, error, refetch } = useReadContracts({
        contracts: [
            {
                address: BAIT_ADDRESS,
                abi: BAIT_ABI,
                functionName: 'balanceOf',
                args: [address!, BaitType.Common],
            },
            {
                address: BAIT_ADDRESS,
                abi: BAIT_ABI,
                functionName: 'balanceOf',
                args: [address!, BaitType.Rare],
            },
            {
                address: BAIT_ADDRESS,
                abi: BAIT_ABI,
                functionName: 'balanceOf',
                args: [address!, BaitType.Epic],
            },
        ],
        query: {
            enabled: isConnected && !!address,
            staleTime: 30_000,       // Data valid for 30 seconds
            gcTime: 5 * 60 * 1000,   // Keep in cache for 5 minutes
        },
    });

    return {
        /** Common bait count */
        common: data?.[0]?.result ? Number(data[0].result) : 0,
        /** Rare bait count */
        rare: data?.[1]?.result ? Number(data[1].result) : 0,
        /** Epic bait count */
        epic: data?.[2]?.result ? Number(data[2].result) : 0,
        /** Total bait count */
        total: (data?.[0]?.result ? Number(data[0].result) : 0) +
            (data?.[1]?.result ? Number(data[1].result) : 0) +
            (data?.[2]?.result ? Number(data[2].result) : 0),
        /** Loading state */
        isLoading,
        /** Error if any */
        error,
        /** Refetch function */
        refetch,
    };
}
