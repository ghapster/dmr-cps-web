import FadeIn from "./FadeIn";
import CountUp from "./CountUp";

const stats = [
  { value: 30, suffix: "+", label: "Features" },
  { value: 4000, suffix: "+", label: "Channel capacity" },
  { value: 50, suffix: "+", label: "Radio settings" },
  { value: 50, label: "Step undo history" },
];

export default function Stats() {
  return (
    <section className="relative py-16">
      <div className="section-divider" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 100}>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  <CountUp
                    end={stat.value}
                    suffix={stat.suffix || ""}
                    duration={2000}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
      <div className="section-divider" />
    </section>
  );
}
