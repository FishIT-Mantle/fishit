import Image from "next/image";
import { useRouter } from "next/navigation";

interface SelectZoneModalProps {
    onClose: () => void;
}

export default function SelectZoneModal({ onClose }: SelectZoneModalProps) {
    const router = useRouter();

    const handleZoneSelect = (slug: string) => {
        router.push(`/gameplay/${slug}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0D1936]/90 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className="relative z-10 w-full max-w-[1200px] rounded-[24px] overflow-hidden backdrop-blur-xl bg-[#0D1936] border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                    <h2 className="text-2xl font-semibold text-white tracking-wide">Select Zone</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-8 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {[
                            {
                                id: 1,
                                name: "Shallow Waters",
                                image: "/gameplay/shallow-water.webp",
                                license: "License: None",
                                cost: "Cost: 1 Bait (Any)",
                                junk: "High Junk Rate",
                                desc: "Good for farming Common fish",
                                btnText: "Enter Zone",
                                slug: "shallow-waters",
                                burn: null,
                                extra: null
                            },
                            {
                                id: 2,
                                name: "Reef Zone",
                                image: "/gameplay/reef-zone.webp",
                                license: "License: Tier I",
                                cost: "Cost: 1 Bait",
                                burn: "Burn: 3 Common Fish",
                                desc: "Balanced drop rates. Essential for upgrades.",
                                btnText: "Enter (Burn 3 Common)",
                                slug: "reef-zone",
                                extra: null
                            },
                            {
                                id: 3,
                                name: "Deep Sea",
                                image: "/gameplay/deep-sea.webp",
                                license: "License: Tier II",
                                cost: "Fee: 1 MNT",
                                burn: "Burn: 2 Rare Fish",
                                desc: "Home of the Whales. Increased Epic chance.",
                                btnText: "ENTER (Pay 1 MNT + Burn)",
                                slug: "deep-sea",
                                extra: null
                            },
                            {
                                id: 4,
                                name: "Abyssal Trench",
                                image: "/gameplay/abyssal-trench.webp",
                                license: "License: Tier III",
                                cost: "Fee: 1 MNT",
                                burn: "Burn: 1 Epic Fish",
                                desc: "The only source of Legendary Fish",
                                btnText: "Enter Zone",
                                slug: "abyssal-trench",
                                extra: "Epic Bait Only"
                            }
                        ].map((zone) => (
                            <div key={zone.id} className="group relative rounded-[20px] p-5 flex flex-col items-center text-center transition-all duration-300 backdrop-blur-xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(120,140,255,0.35)_0%,rgba(40,60,140,0.35)_45%,rgba(20,35,80,0.45)_100%)] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_25px_rgba(120,140,255,0.35)] hover:transform hover:scale-[1.02] hover:shadow-[0_12px_50px_rgba(84,72,232,0.5)]">

                                {/* Image */}
                                <div className="relative w-[180px] h-[100px] rounded-xl overflow-hidden mb-5 border border-white/10 shadow-lg mx-auto">
                                    <Image src={zone.image} alt={zone.name} fill className="object-cover" />
                                    <div className="absolute inset-0 bg-black/10" />
                                </div>

                                {/* Zone Label */}
                                <p className="text-gray-400 text-sm mb-1 font-medium tracking-wide">Zone {zone.id}</p>

                                {/* Title */}
                                <h3 className="text-2xl font-bold text-white mb-5">{zone.name}</h3>

                                {/* License Pill */}
                                <div className="w-full max-w-[200px] py-1.5 rounded-full border border-[#5C64CC]/40 bg-[#1E2546]/30 text-[#A0AEC0] text-sm font-medium mb-6 mx-auto">
                                    {zone.license}
                                </div>

                                {/* Details Info */}
                                <div className="w-full space-y-2 mb-8 flex-1 flex flex-col justify-start items-center">

                                    {zone.burn && (
                                        <div className="flex items-center gap-1.5 text-[#FF9F43] text-xs font-semibold">
                                            <span>🔥</span>
                                            <span>{zone.burn}</span>
                                        </div>
                                    )}

                                    <p className="text-gray-300 text-sm font-medium">{zone.cost}</p>

                                    {zone.junk && (
                                        <p className="text-gray-300 text-sm font-medium">{zone.junk}</p>
                                    )}

                                    {zone.extra && (
                                        <div className="flex items-center gap-1.5 text-[#FFC107] text-xs font-bold mt-1">
                                            <span>⚠️</span>
                                            <span>{zone.extra}</span>
                                        </div>
                                    )}

                                    <p className="text-gray-500 text-xs mt-2 max-w-[220px] leading-snug">
                                        {zone.desc}
                                    </p>
                                </div>

                                {/* Button */}
                                <button
                                    onClick={() => handleZoneSelect(zone.slug)}
                                    className="w-full h-[50px] rounded-full bg-[#5448E8] hover:bg-[#4B40D0] text-white text-base font-semibold shadow-[0_4px_15px_rgba(84,72,232,0.4)] hover:shadow-[0_6px_20px_rgba(84,72,232,0.6)] transition-all transform active:scale-[0.98]">
                                    {zone.btnText}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
