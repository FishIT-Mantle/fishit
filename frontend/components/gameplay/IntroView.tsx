import { Button } from "@/components/Button";
import { Zone } from "@/lib/gameplay/zones";

interface IntroViewProps {
    zone: Zone;
    onStart: () => void;
}

export function IntroView({ zone, onStart }: IntroViewProps) {
    return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl tracking-tight animate-fade-in-up delay-100">
                Welcome to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                    {zone.name}
                </span>
            </h1>

            <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-12 drop-shadow-lg leading-relaxed animate-fade-in-up delay-200">
                {zone.description}
            </p>

            <Button
                onClick={onStart}
                className="!px-6 !py-4 !rounded-full !text-lg !font-bold shadow-[0_0_40px_rgba(84,72,232,0.6)] hover:shadow-[0_0_60px_rgba(84,72,232,0.8)] transition-all transform hover:-translate-y-1 active:scale-95 animate-fade-in-up delay-300 !bg-[#5448E8] hover:!bg-[#4B40D0] !h-auto"
            >
                Start Fishing Now
            </Button>
        </div>
    );
}
