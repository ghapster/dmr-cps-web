import { ReactNode } from "react";

interface MonitorFrameProps {
  children: ReactNode;
  className?: string;
}

export default function MonitorFrame({ children, className = "" }: MonitorFrameProps) {
  return (
    <div className={`relative ${className}`}>
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
        {/* Screen content */}
        <div className="rounded-b-lg overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
