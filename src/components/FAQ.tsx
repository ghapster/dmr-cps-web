"use client";

import { useState } from "react";
import FadeIn from "./FadeIn";

const faqs = [
  {
    q: "Does AnyProg work on Mac?",
    a: "Yes. AnyProg runs in your browser using Web Serial API, which works on Chrome, Edge, and Opera on any OS — including macOS. This makes it the only CPS for the D578UV that supports Mac out of the box.",
  },
  {
    q: "Can AnyProg damage my radio?",
    a: "No. AnyProg reads and writes standard .RDT codeplug files — the same format the official Anytone CPS uses. It cannot modify firmware or radio hardware. Writing a codeplug is the same operation the official software performs.",
  },
  {
    q: "Which radios are supported?",
    a: "AnyProg currently supports the Anytone AT-D578UV and its variants (D578UVII, D578UVIII). Support for additional Anytone models (D878UV, D878UVII) is planned.",
  },
  {
    q: "Can I open .RDT files from the official CPS?",
    a: "Yes. AnyProg reads and writes standard Anytone .RDT codeplug files. You can open a file created with the official CPS, edit it in AnyProg, and open the result back in the official CPS — they're fully compatible.",
  },
  {
    q: "What is Web Serial and is it safe?",
    a: "Web Serial is a browser API that lets web apps communicate with USB devices — with your explicit permission. It's built into Chrome, Edge, and Opera. You must select your radio from a system dialog before AnyProg can access it. No data is sent to any server.",
  },
  {
    q: "Is my codeplug data private?",
    a: "Completely. AnyProg runs entirely in your browser. Your codeplug data never leaves your computer unless you explicitly use cloud sync (Pro feature). There's no server processing or telemetry.",
  },
  {
    q: "Does AnyProg work offline?",
    a: "Yes. Once loaded, AnyProg works entirely offline. The only features that require internet are RadioReference lookups and cloud sync. You can edit channels, zones, contacts, and settings without any network connection.",
  },
  {
    q: "Can I still use the official Anytone CPS?",
    a: "Absolutely. AnyProg uses the same .RDT file format, so you can switch between tools freely. Many users use AnyProg for everyday editing and the official CPS for firmware updates.",
  },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <FadeIn delay={index * 80}>
      <div className="border-b border-white/[0.06]">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-5 text-left group"
        >
          <span className="text-white font-medium pr-4 group-hover:text-primary-light transition-colors">
            {q}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            open ? "max-h-96 pb-5" : "max-h-0"
          }`}
        >
          <p className="text-gray-400 leading-relaxed">{a}</p>
        </div>
      </div>
    </FadeIn>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Frequently Asked Questions
            </h2>
          </div>
        </FadeIn>

        <div>
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
