'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseEther } from 'viem';
import { BAIT_ADDRESS, BAIT_ABI } from '../contracts';
import { BaitType } from './useBaitBalance';
import { useEffect } from 'react';

/**
 * Bait prices in MNT (matching smart contract)
 */
export const BAIT_PRICES: Record<BaitType, string> = {
    [BaitType.Common]: '1',  // 1 MNT
    [BaitType.Rare]: '2',    // 2 MNT
    [BaitType.Epic]: '4',    // 4 MNT
};

/**
 * Hook to purchase bait from the smart contract
 * @returns purchase function and transaction states
 */
export function usePurchaseBait() {
    const queryClient = useQueryClient();

    const {
        writeContract,
        data: hash,
        isPending,
        error: writeError,
        reset,
    } = useWriteContract();

    const {
        isLoading: isConfirming,
        isSuccess,
        error: confirmError,
    } = useWaitForTransactionReceipt({ hash });

    // Invalidate bait balance queries when transaction is confirmed
    useEffect(() => {
        if (isSuccess) {
            // Invalidate all readContracts queries to refresh bait balances
            queryClient.invalidateQueries({ queryKey: ['readContracts'] });
            // Also invalidate balance queries for MNT
            queryClient.invalidateQueries({ queryKey: ['balance'] });
        }
    }, [isSuccess, queryClient]);

    /**
     * Purchase bait
     * @param baitType - Type of bait (0=Common, 1=Rare, 2=Epic)
     * @param amount - Amount to purchase
     */
    const purchase = (baitType: BaitType, amount: number = 1) => {
        if (amount <= 0) return;

        const pricePerUnit = BAIT_PRICES[baitType];
        const totalCost = parseEther((Number(pricePerUnit) * amount).toString());

        writeContract({
            address: BAIT_ADDRESS,
            abi: BAIT_ABI,
            functionName: 'purchaseBait',
            args: [baitType, BigInt(amount)],
            value: totalCost,
        });
    };

    return {
        /** Purchase function */
        purchase,
        /** Transaction hash */
        hash,
        /** Is transaction pending (waiting for wallet) */
        isPending,
        /** Is transaction confirming (on chain) */
        isConfirming,
        /** Is transaction successful */
        isSuccess,
        /** Write error */
        writeError,
        /** Confirmation error */
        confirmError,
        /** Reset state */
        reset,
    };
}
