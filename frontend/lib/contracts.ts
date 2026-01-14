import { parseEther } from 'viem';

// --- Addresses ---
export const GAME_ADDRESS = "0xe72c38663d6d55571b612e2b13bb487bc080dac4";
export const BAIT_ADDRESS = "0x4ec2bec2ad61d5bb667b3ebf79fcf1702a23bcfc";
export const NFT_ADDRESS  = "0x198501e64c00396636e535d9a2a4a9bd95c18b49";

// --- ABIs (Minimal interfaces) ---

export const GAME_ABI = [
  {
    inputs: [
      { internalType: "uint8", name: "baitType", type: "uint8" },
      { internalType: "uint8", name: "zoneId", type: "uint8" }
    ],
    name: "castLine",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint8", name: "zoneId", type: "uint8" }
    ],
    name: "LineCast",
    type: "event"
  }
] as const;

export const BAIT_ABI = [
  {
    inputs: [
      { internalType: "enum FishBait.BaitType", name: "baitType", type: "uint8" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "purchaseBait",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "enum FishBait.BaitType", name: "baitType", type: "uint8" }
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

export const NFT_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  }
] as const;