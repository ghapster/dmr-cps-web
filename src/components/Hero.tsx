import FadeIn from "./FadeIn";
import MockDashboard from "./mocks/MockDashboard";

export default function Hero() {
  return (
    <section className="relative pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.07] rounded-full blur-[120px]" />
      </div>

      {/* Headline + CTA */}
      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 pt-24 sm:pt-36 pb-8">
        <FadeIn direction="up" duration={800}>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight max-w-3xl text-gradient-hero">
            Finally, a CPS that doesn&apos;t
            <br />
            make you suffer.
          </h1>
        </FadeIn>

        <FadeIn direction="up" delay={150} duration={800}>
          <p className="mt-6 text-base sm:text-lg text-gray-500 max-w-xl leading-relaxed">
            AnyProg is a web-based codeplug editor for the Anytone D578UV.
            Edit channels, zones, and settings right in your browser — no
            installs, no Windows required. Even works on Mac.
          </p>
        </FadeIn>

        <FadeIn direction="up" delay={300} duration={800}>
          <div className="mt-8 flex items-center gap-4">
            <a
              href="https://ghapster.github.io/dmr-cps-web/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black font-semibold px-6 py-3 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              Open AnyProg
            </a>
            <a
              href="#features"
              className="text-gray-500 hover:text-gray-300 font-medium text-sm transition-colors"
            >
              See features &rarr;
            </a>
          </div>
        </FadeIn>
      </div>

      {/* Full-width dashboard mock with gradient overlay */}
      <div className="relative">
        {/* Bottom-to-top gradient wash */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.06) 40%, transparent 70%)',
          }}
        />

        <FadeIn direction="up" delay={400} duration={1000}>
          <div className="relative max-w-5xl mx-auto px-6 sm:px-8 pt-8 pb-24">
            {/* Glossy monitor frame */}
            <div
              className="rounded-xl p-[5px] shadow-[0_25px_80px_-12px_rgba(0,0,0,0.6)]"
              style={{
                background: 'linear-gradient(160deg, #333 0%, #111 30%, #000 50%, #111 70%, #222 100%)',
              }}
            >
              {/* Top bezel with traffic lights */}
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 40%, transparent 100%)',
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              {/* Screen */}
              <div className="rounded-b-lg overflow-hidden">
                <MockDashboard />
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
