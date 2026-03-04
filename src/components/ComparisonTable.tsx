import FadeIn from "./FadeIn";

const Check = () => (
  <svg className="w-5 h-5 text-accent-green mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const X = () => (
  <svg className="w-5 h-5 text-accent-red/60 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Dash = () => (
  <span className="text-gray-600 block text-center">—</span>
);

type CellValue = "check" | "x" | "dash";

interface Row {
  feature: string;
  values: [CellValue, CellValue, CellValue, CellValue, CellValue];
}

const columns = ["AnyProg Free", "AnyProg Pro", "Anytone CPS", "RT Systems", "CHIRP"];

const rows: Row[] = [
  { feature: "Web-based (no install)", values: ["check", "check", "x", "x", "x"] },
  { feature: "Mac / Linux support", values: ["check", "check", "x", "x", "check"] },
  { feature: "Channel editor", values: ["check", "check", "check", "check", "check"] },
  { feature: "Zone / scan list editor", values: ["check", "check", "check", "check", "dash"] },
  { feature: "Radio settings (50+)", values: ["check", "check", "check", "dash", "x"] },
  { feature: "USB read/write", values: ["x", "check", "check", "check", "dash"] },
  { feature: "RadioReference import", values: ["x", "check", "x", "x", "x"] },
  { feature: "CSV import/export", values: ["check", "check", "x", "check", "check"] },
  { feature: "Bulk edit", values: ["x", "check", "x", "x", "x"] },
  { feature: "Undo / redo", values: ["check", "check", "x", "x", "x"] },
  { feature: "Cloud sync", values: ["x", "check", "x", "x", "x"] },
];

const priceRow = ["Free", "$5/mo", "Free", "~$30", "Free"];

const Cell = ({ value }: { value: CellValue }) => {
  if (value === "check") return <Check />;
  if (value === "x") return <X />;
  return <Dash />;
};

export default function ComparisonTable() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              How AnyProg Compares
            </h2>
            <p className="mt-4 text-sm sm:text-base text-gray-400">
              The only web-based CPS with Mac support and modern features.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="overflow-x-auto rounded-xl border border-white/[0.06] -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm min-w-[480px]">
              <thead>
                <tr className="bg-surface-light">
                  <th className="text-left px-3 sm:px-4 py-3 sm:py-4 text-gray-400 font-medium">
                    Feature
                  </th>
                  {columns.map((col, i) => (
                    <th
                      key={col}
                      className={`px-2 sm:px-4 py-3 sm:py-4 text-center font-medium whitespace-nowrap ${
                        i === 1
                          ? "text-primary-light bg-primary/[0.05]"
                          : "text-gray-400"
                      } ${i >= 2 ? "hidden sm:table-cell" : ""}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-white/[0.04] ${
                      ri % 2 === 0 ? "bg-[#0d0d0d]" : "bg-[#0a0a0a]"
                    }`}
                  >
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-300">{row.feature}</td>
                    {row.values.map((v, ci) => (
                      <td
                        key={ci}
                        className={`px-2 sm:px-4 py-2.5 sm:py-3 ${
                          ci === 1 ? "bg-primary/[0.03]" : ""
                        } ${ci >= 2 ? "hidden sm:table-cell" : ""}`}
                      >
                        <Cell value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Price row */}
                <tr className="border-t border-white/[0.06] bg-surface-light">
                  <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-gray-300 font-medium">Price</td>
                  {priceRow.map((p, i) => (
                    <td
                      key={i}
                      className={`px-2 sm:px-4 py-2.5 sm:py-3 text-center font-medium ${
                        i === 1
                          ? "text-primary-light bg-primary/[0.05]"
                          : "text-gray-400"
                      } ${i >= 2 ? "hidden sm:table-cell" : ""}`}
                    >
                      {p}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-600 text-center sm:hidden">
            Scroll to see competitor comparison
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
