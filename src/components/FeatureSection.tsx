import { ReactNode } from "react";
import FadeIn from "./FadeIn";
import MonitorFrame from "./MonitorFrame";

interface FeatureItem {
  icon: ReactNode;
  text: string;
}

interface FeatureSectionProps {
  id?: string;
  badge?: { label: string; color: "green" | "amber" | "cyan" };
  title: string;
  description: string;
  features: FeatureItem[];
  mockup: ReactNode;
  reversed?: boolean;
}

const badgeColors = {
  green: "bg-accent-green/10 text-accent-green border-accent-green/20",
  amber: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
  cyan: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
};

export default function FeatureSection({
  id,
  badge,
  title,
  description,
  features,
  mockup,
  reversed = false,
}: FeatureSectionProps) {
  return (
    <section id={id} className="py-12 sm:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div
          className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center`}
          style={reversed ? { direction: "rtl" } : undefined}
        >
          {/* Text side */}
          <div style={reversed ? { direction: "ltr" } : undefined}>
            <FadeIn direction={reversed ? "right" : "left"}>
              {badge && (
                <span
                  className={`inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border mb-4 ${badgeColors[badge.color]}`}
                >
                  {badge.label}
                </span>
              )}
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                {title}
              </h3>
              <p className="mt-4 text-gray-400 leading-relaxed">
                {description}
              </p>

              <ul className="mt-8 space-y-4">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 text-accent-green flex-shrink-0">
                      {f.icon}
                    </div>
                    <span className="text-gray-300">{f.text}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>

          {/* Mockup side */}
          <div style={reversed ? { direction: "ltr" } : undefined}>
            <FadeIn direction={reversed ? "left" : "right"} delay={200}>
              <MonitorFrame>
                {mockup}
              </MonitorFrame>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
