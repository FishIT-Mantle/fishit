import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantleSepoliaTestnet } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'FishIt',
  projectId: 'YOUR_PROJECT_ID', // Get one from https://cloud.walletconnect.com (Optional for local dev)
  chains: [mantleSepoliaTestnet],
  transports: {
    [mantleSepoliaTestnet.id]: http(),
  },
  ssr: true,
});