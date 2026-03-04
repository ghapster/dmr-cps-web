import FadeIn from "./FadeIn";

const steps = [
  {
    number: "1",
    title: "Connect",
    description: "Plug in your Anytone D578UV via USB. AnyProg detects it instantly using Web Serial.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.07-9.07 1.757-1.757a4.5 4.5 0 0 1 6.364 6.364l-4.5 4.5a4.5 4.5 0 0 1-7.244-1.242" />
      </svg>
    ),
  },
  {
    number: "2",
    title: "Edit",
    description: "Use the spreadsheet-style editor to manage channels, zones, contacts, and 50+ radio settings.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
  },
  {
    number: "3",
    title: "Write",
    description: "One click writes the codeplug back to your radio. Done in under a minute.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              How It Works
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Three steps. No software to install. No drivers to wrestle.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <FadeIn key={step.title} delay={i * 150}>
              <div className="relative p-6 md:p-8 rounded-xl bg-surface-light border border-white/[0.06] hover:border-white/[0.12] transition-colors group">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t border-dashed border-white/[0.1]" />
                )}

                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary-light mb-6 group-hover:bg-primary/20 transition-colors">
                  {step.icon}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-primary-light bg-primary/10 px-2 py-0.5 rounded">
                    {step.number}
                  </span>
                  <h3 className="text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                </div>

                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={500}>
          <p className="mt-10 text-center text-sm text-gray-500">
            Or just open and save <code className="text-gray-400 bg-white/[0.05] px-1.5 py-0.5 rounded">.RDT</code> files — no radio connection needed.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
