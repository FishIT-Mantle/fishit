import {
  getDefaultConfig,
  Chain,
} from '@rainbow-me/rainbowkit';
import { mantle } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'FishIt',
  projectId: 'YOUR_PROJECT_ID', // TODO: User needs to replace this
  chains: [mantle],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
