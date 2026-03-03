import FadeIn from "./FadeIn";
import MonitorFrame from "./MonitorFrame";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.07] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <div>
            <FadeIn>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                <span className="text-white">Finally, a CPS that doesn&apos;t make you </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-accent-cyan">
                  suffer.
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={150}>
              <p className="mt-6 text-lg text-gray-400 leading-relaxed max-w-xl">
                AnyProg is a web-based codeplug editor for the Anytone D578UV.
                Edit channels, zones, and settings right in your browser — no
                installs, no Windows required. Even works on Mac.
              </p>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://ghapster.github.io/dmr-cps-web/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                >
                  Open AnyProg
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/[0.1] text-gray-300 hover:text-white hover:border-white/[0.2] font-medium transition-colors"
                >
                  See Features
                </a>
              </div>
            </FadeIn>
          </div>

          {/* Screenshot */}
          <FadeIn direction="left" delay={200}>
            <MonitorFrame
              src="/dmr-cps-landing/screenshots/hero-channel-editor.png"
              alt="AnyProg channel editor"
            />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
