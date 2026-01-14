import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { NFT_ADDRESS, NFT_ABI } from '@/lib/contracts';
import { readContract } from '@wagmi/core';
import { config } from '@/lib/config';

interface CollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FishNFT {
    id: number;
    name: string;
    image: string;
    attributes: { trait_type: string; value: string }[];
}

export function CollectionModal({ isOpen, onClose }: CollectionModalProps) {
    const { address } = useAccount();
    const [nfts, setNfts] = useState<FishNFT[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && address) {
            fetchCollection();
        }
    }, [isOpen, address]);

    const fetchCollection = async () => {
        setLoading(true);
        const foundNfts: FishNFT[] = [];

        // SIMPLE SCANNER: Check IDs 1 to 20
        // (In production, you'd use a Subgraph or Indexer API)
        for (let i = 1; i <= 20; i++) {
            try {
                // 1. Check Owner
                const owner = await readContract(config, {
                    address: NFT_ADDRESS,
                    abi: NFT_ABI,
                    functionName: 'ownerOf',
                    args: [BigInt(i)],
                });

                // 2. If I own it, fetch data
                if (owner === address) {
                    const uri = await readContract(config, {
                        address: NFT_ADDRESS,
                        abi: NFT_ABI,
                        functionName: 'tokenURI',
                        args: [BigInt(i)],
                    });

                    // 3. Resolve IPFS URL (ipfs://... -> https://gateway...)
                    if (uri && uri.startsWith('ipfs://')) {
                        const httpUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                        const metaResponse = await fetch(httpUrl);
                        const metadata = await metaResponse.json();

                        foundNfts.push({
                            id: i,
                            name: metadata.name,
                            image: metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
                            attributes: metadata.attributes
                        });
                    }
                }
            } catch (e) {
                // Token likely doesn't exist yet, skip
            }
        }

        setNfts(foundNfts);
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1b26] w-full max-w-4xl h-[80vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span>🎒</span> My Collection
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        ✕
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-white/50 animate-pulse">Scanning Blockchain...</p>
                        </div>
                    ) : nfts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/40">
                            <p className="text-xl">No fish found... yet!</p>
                            <p className="text-sm">Cast your line to mint your first NFT.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {nfts.map((nft) => (
                                <div key={nft.id} className="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-blue-400/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                    <div className="aspect-square relative overflow-hidden bg-black/20">
                                        <img 
                                            src={nft.image} 
                                            alt={nft.name} 
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-mono border border-white/10">
                                            #{nft.id}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg text-white mb-1">{nft.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {nft.attributes.map((attr, idx) => (
                                                <span key={idx} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-white/70">
                                                    {attr.value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}