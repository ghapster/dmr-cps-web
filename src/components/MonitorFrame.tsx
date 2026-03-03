import Image from "next/image";

interface MonitorFrameProps {
  src: string;
  alt: string;
  className?: string;
}

export default function MonitorFrame({ src, alt, className = "" }: MonitorFrameProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Monitor frame */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] shadow-2xl shadow-black/50 overflow-hidden">
        {/* macOS title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-white/[0.06]">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-gray-500">AnyProg — Anytone D578UV</span>
        </div>
        {/* Screenshot */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-surface-light to-surface">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
    </div>
  );
}
