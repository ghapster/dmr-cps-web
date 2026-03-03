import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import FeatureSection from "@/components/FeatureSection";
import ComparisonTable from "@/components/ComparisonTable";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

const CheckIcon = (
  <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Stats />

      <div id="features">
        <FeatureSection
          title="A real spreadsheet for your channels"
          description="Click any cell to edit. Sort, filter, duplicate, and rearrange channels the way you'd expect — not the way a 2005 Windows app forces you to."
          features={[
            { icon: CheckIcon, text: "Inline editing — click any cell to change it" },
            { icon: CheckIcon, text: "Sort by frequency, name, zone, or any column" },
            { icon: CheckIcon, text: "Duplicate channels with one click" },
            { icon: CheckIcon, text: "Multi-select rows for bulk operations" },
          ]}
          screenshot={{
            src: "/dmr-cps-landing/screenshots/hero-channel-editor.png",
            alt: "Channel editor spreadsheet",
          }}
        />

        <FeatureSection
          badge={{ label: "Mac Support", color: "green" }}
          title="The only CPS that works on Mac"
          description="AnyProg uses the Web Serial API to connect directly to your radio via USB. No drivers, no virtual machines, no Boot Camp. Just plug in and go."
          features={[
            { icon: CheckIcon, text: "Works on Chrome, Edge, and Opera" },
            { icon: CheckIcon, text: "macOS, Windows, Linux, ChromeOS" },
            { icon: CheckIcon, text: "Read codeplug from radio in under 60 seconds" },
            { icon: CheckIcon, text: "Write back with one click" },
          ]}
          screenshot={{
            src: "/dmr-cps-landing/screenshots/usb-connected.png",
            alt: "USB connected to D578UV",
          }}
          reversed
        />

        <FeatureSection
          title="Bulk edit, import, and look up — all built in"
          description="Power tools that save hours of manual entry. Import frequencies from RadioReference, bulk-edit channel properties, and import/export CSV files."
          features={[
            { icon: CheckIcon, text: "Select multiple channels, apply changes in one action" },
            { icon: CheckIcon, text: "RadioReference.com frequency lookup" },
            { icon: CheckIcon, text: "CSV import and export for spreadsheet workflows" },
            { icon: CheckIcon, text: "50-step undo/redo — mistakes aren't permanent" },
          ]}
          screenshot={{
            src: "/dmr-cps-landing/screenshots/bulk-edit.png",
            alt: "Bulk edit panel",
          }}
        />

        <FeatureSection
          badge={{ label: "New", color: "amber" }}
          title="50+ radio settings, organized and editable"
          description="Nine tabs covering display, audio, key functions, GPS, Bluetooth, APRS, and more. Dual-codec support reads settings from both the RDT file and radio memory."
          features={[
            { icon: CheckIcon, text: "9 organized settings tabs" },
            { icon: CheckIcon, text: "APRS, GPS, and Bluetooth configuration" },
            { icon: CheckIcon, text: "Custom key function assignments" },
            { icon: CheckIcon, text: "Boot screen, display brightness, timeout settings" },
          ]}
          screenshot={{
            src: "/dmr-cps-landing/screenshots/settings-tabs.png",
            alt: "Radio settings tabs",
          }}
          reversed
        />
      </div>

      <ComparisonTable />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
    </>
  );
}
