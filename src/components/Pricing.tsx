import FadeIn from "./FadeIn";

const Check = ({ text }: { text: string }) => (
  <li className="flex items-start gap-3">
    <svg className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
    <span className="text-gray-300">{text}</span>
  </li>
);

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Simple Pricing
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              Start for free. Upgrade when you need USB access and power tools.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <FadeIn delay={100}>
            <div className="h-full p-6 sm:p-8 rounded-xl bg-surface-light border border-white/[0.06] flex flex-col">
              <h3 className="text-xl font-bold text-white">Free</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-gray-500">/forever</span>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Everything you need to edit codeplug files.
              </p>

              <ul className="mt-8 space-y-3 flex-1">
                <Check text="Open & save .RDT files" />
                <Check text="Channel / zone / contact editors" />
                <Check text="50+ radio settings" />
                <Check text="CSV export" />
                <Check text="50-step undo / redo" />
                <Check text="Frequency validation" />
              </ul>

              <a
                href="https://ghapster.github.io/dmr-cps-web/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 block text-center py-3 rounded-lg border border-white/[0.1] text-gray-300 hover:text-white hover:border-white/[0.2] font-medium transition-colors"
              >
                Get Started Free
              </a>
            </div>
          </FadeIn>

          {/* Pro */}
          <FadeIn delay={250}>
            <div className="relative h-full p-6 sm:p-8 rounded-xl bg-surface-light border border-primary/30 flex flex-col">
              {/* Glow */}
              <div className="absolute inset-0 rounded-xl bg-primary/[0.04] pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/20">
                    Popular
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$5</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  or $39/year (save 35%)
                </p>

                <ul className="mt-8 space-y-3 flex-1">
                  <Check text="Everything in Free" />
                  <Check text="USB read/write to radio" />
                  <Check text="RadioReference frequency lookup" />
                  <Check text="CSV import" />
                  <Check text="Bulk edit channels" />
                  <Check text="Cloud sync across devices" />
                </ul>

                <a
                  href="https://ghapster.github.io/dmr-cps-web/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 block text-center py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                >
                  Start Free Trial
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
