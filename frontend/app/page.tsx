import { Navigation } from "@/components/Navigation";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
      <Navigation />

      <main className="relative isolate pt-14">
        {/* Background Gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#06b6d4] to-[#3b82f6] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="py-24 sm:py-32 lg:pb-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6">
                Stake MNT. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  Catch NFT Fish.
                </span> <br />
                Boost Yield.
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-400">
                FishIt is the first GameFi Layer on Mantle. Turn your staking into a fishing adventure.
                Collect unique AI-generated fish and maximize your returns.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-sm hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
                >
                  Start Fishing
                </Link>
                <Link href="#" className="text-sm font-semibold leading-6 text-white hover:text-cyan-400 transition-colors">
                  Read Whitepaper <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {[
                { label: 'Total Staked', value: '$2.4M+' },
                { label: 'Fish Caught', value: '14,203' },
                { label: 'Yield Boosted', value: 'Up to 5%' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
