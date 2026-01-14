/**
 * Smart Contract Addresses and ABIs
 * Addresses are loaded from environment variables for flexibility
 */

// --- Address Validation ---
const validateAddress = (address: string | undefined, name: string): `0x${string}` => {
  if (!address || !address.startsWith('0x')) {
    throw new Error(`Missing or invalid ${name} in environment variables. Check your .env.local file.`);
  }
  return address as `0x${string}`;
};

// --- Addresses (from environment) ---
export const GAME_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_GAME_ADDRESS,
  'NEXT_PUBLIC_GAME_ADDRESS'
);

export const BAIT_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_BAIT_ADDRESS,
  'NEXT_PUBLIC_BAIT_ADDRESS'
);

export const NFT_ADDRESS = validateAddress(
  process.env.NEXT_PUBLIC_NFT_ADDRESS,
  'NEXT_PUBLIC_NFT_ADDRESS'
);

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