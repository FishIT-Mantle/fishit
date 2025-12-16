import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Montserrat, Poppins } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-montserrat",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

export default function Home() {
  return (
    <div className={`relative min-h-screen overflow-hidden ${poppins.className}`}>
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/bg-1.webp"
          alt="Underwater Background"
          fill
          priority
          className="object-cover object-center"
          quality={100}
        />
        {/* Overlay for better text readability if needed, though design seems to rely on the image's dark vibe */}
        <div className="absolute inset-0 bg-navy-900/20 mix-blend-multiply" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-8 left-8 z-50 flex items-center">
        <Image
          src="/images/logo-name.webp"
          alt="Fish It Logo"
          width={180}
          height={60}
          className="object-contain h-12 w-auto"
          priority
        />
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">

        {/* Hero Section */}
        <div className="flex flex-col items-center">
          {/* Title with decorative elements */}
          <div className="relative flex items-center justify-center gap-4">
            <h1 className={`${montserrat.className} text-[80px] md:text-[100px] leading-tight font-bold text-white drop-shadow-[0_0_25px_rgba(100,200,255,0.4)]`}>
              Fish It
            </h1>

            {/* Bubble Asset */}
            <div className="relative w-16 h-16 md:w-20 md:h-20 animate-bounce duration-[3000ms]">
              <Image
                src="/images/bubble.webp"
                alt="Bubbles"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-[20px] md:text-[24px] text-gray-200 font-normal">
            The ocean calls. Are you ready to cast your line?
          </p>

          {/* Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-6">
            <Button href="/dashboard" variant="primary">
              Start Fishing Now
            </Button>

            <Button href="#" variant="secondary">
              Go to Marketplace
            </Button>
          </div>
        </div>
      </main>

      {/* Light Rays / Volumetric Effect Simulation (CSS Overlay) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-gradient-to-b from-blue-300/10 via-transparent to-transparent blur-3xl pointer-events-none mix-blend-overlay" />
    </div>
  );
}
