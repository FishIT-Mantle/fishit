import { Navigation } from "@/components/Navigation";
import { FishingGame } from "@/components/FishingGame";
import { StakingPanel } from "@/components/StakingPanel";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
                    {/* Left Column: Staking & Stats (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <StakingPanel />

                        <div className="flex-1 bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-zinc-500 mb-4 uppercase tracking-wider">Your Aquarium</h3>
                            <div className="text-center text-zinc-500 text-sm py-12">
                                No fish caught yet. <br /> Start fishing to fill your tank!
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Fishing Game (8 cols) */}
                    <div className="lg:col-span-8 h-[600px] lg:h-auto">
                        <FishingGame />
                    </div>
                </div>
            </main>
        </div>
    );
}
