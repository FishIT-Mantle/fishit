"use client";

import dynamic from 'next/dynamic';
import { FishingGameProps, FishingGameHandle } from './FishingGame';
import { forwardRef } from 'react';

// Dynamic import with SSR disabled - CRITICAL for Phaser
const FishingGameCore = dynamic(
    () => import('./FishingGame'),
    {
        ssr: false,
        loading: () => (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white text-lg animate-pulse">Loading Game...</div>
            </div>
        )
    }
);

// Wrapper to forward ref through dynamic component
const FishingGameWrapper = forwardRef<FishingGameHandle, FishingGameProps>((props, ref) => {
    return <FishingGameCore {...props} ref={ref} />;
});

FishingGameWrapper.displayName = 'FishingGameWrapper';

export default FishingGameWrapper;
