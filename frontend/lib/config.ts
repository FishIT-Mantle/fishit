import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantleSepoliaTestnet } from 'wagmi/chains';
import { http } from 'wagmi';

// WalletConnect Project ID - Required for production
// Get yours at: https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Development fallback - WalletConnect provides a demo project ID for testing
// This should NOT be used in production!
const DEVELOPMENT_PROJECT_ID = 'c4f79cc821944d9680842e34466bfb';

if (!projectId && typeof window !== 'undefined') {
  console.warn(
    '[FishIT] Using development WalletConnect Project ID. ' +
    'For production, set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local. ' +
    'Get your Project ID at https://cloud.walletconnect.com'
  );
}

export const config = getDefaultConfig({
  appName: 'FishIt',
  projectId: projectId || DEVELOPMENT_PROJECT_ID,
  chains: [mantleSepoliaTestnet],
  transports: {
    [mantleSepoliaTestnet.id]: http(),
  },
  ssr: true,
});