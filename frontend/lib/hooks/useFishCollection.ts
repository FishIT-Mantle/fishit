'use client';

import { useReadContract, useAccount } from 'wagmi';
import { NFT_ADDRESS, NFT_ABI } from '../contracts';

/**
 * Hook to get user's fish NFT collection count
 * @returns total fish count, loading state, and refetch function
 */
export function useFishCollection() {
    const { address, isConnected } = useAccount();

    const { data, isLoading, error, refetch } = useReadContract({
        address: NFT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'balanceOf',
        args: [address!],
        query: {
            enabled: isConnected && !!address,
            staleTime: 60_000,       // NFT count changes less frequently
            gcTime: 10 * 60 * 1000,  // Keep in cache for 10 minutes
        },
    });

    return {
        /** Total fish NFT count */
        totalCount: data ? Number(data) : 0,
        /** Loading state */
        isLoading,
        /** Error if any */
        error,
        /** Refetch function */
        refetch,
    };
}
