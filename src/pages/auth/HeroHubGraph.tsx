import React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface PortalNode {
  id: string;
  name: string;
  angleDeg: number; // Angle in degrees from center
  isLive: boolean;
  statusLabel?: string;
}

const PORTAL_NODES: PortalNode[] = [
  { id: "commission", name: "Commission", angleDeg: 270, isLive: true, statusLabel: "Active" }, // Top (Live)
  { id: "leasing", name: "Leasing", angleDeg: 321.4, isLive: false, statusLabel: "Upcoming" }, // Top-Right
  { id: "ranker", name: "Ranker", angleDeg: 12.9, isLive: true, statusLabel: "Active" }, // Mid-Right (Live)
  { id: "reporting", name: "Reporting", angleDeg: 64.3, isLive: false, statusLabel: "Upcoming" }, // Bottom-Right
  { id: "scheduling", name: "Scheduling", angleDeg: 115.7, isLive: false, statusLabel: "Upcoming" }, // Bottom-Left
  {
    id: "leave-mgmt",
    name: "Leave Management",
    angleDeg: 167.1,
    isLive: true,
    statusLabel: "Active",
  }, // Mid-Left (Live)
  { id: "ticketing", name: "Ticketing", angleDeg: 218.6, isLive: false, statusLabel: "Upcoming" }, // Top-Left
];

export function HeroHubGraph() {
  const viewBoxSize = 420;
  const center = viewBoxSize / 2;
  const radius = 142; // Distance from center to nodes

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-md mx-auto select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-white/20 via-purple-500/10 to-transparent blur-2xl pointer-events-none rounded-full" />

      {/* SVG Network Canvas */}
      <div className="relative w-full aspect-square max-w-[380px] sm:max-w-[400px]">
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Glowing filter for active live lines */}
            <filter id="glow-live" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient for live data stream */}
            <linearGradient id="live-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#c4b5fd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
            </linearGradient>

            {/* Inactive line gradient */}
            <linearGradient id="inactive-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Concentric ambient orbital rings */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <circle
            cx={center}
            cy={center}
            r={radius * 0.65}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />

          {/* Connecting Lines */}
          {PORTAL_NODES.map((node) => {
            const angleRad = (node.angleDeg * Math.PI) / 180;
            const x2 = center + radius * Math.cos(angleRad);
            const y2 = center + radius * Math.sin(angleRad);

            if (node.isLive) {
              return (
                <g key={`line-${node.id}`}>
                  {/* Glowing wide background halo line */}
                  <line
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke="#c4b5fd"
                    strokeWidth="4"
                    strokeOpacity="0.75"
                    filter="url(#glow-live)"
                  />
                  {/* Crisp primary bright foreground line */}
                  <line
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeOpacity="0.95"
                  />
                  {/* Animated traveling data particle outwards */}
                  <circle r="4.5" fill="#ffffff" filter="url(#glow-live)">
                    <animateMotion
                      path={`M ${center} ${center} L ${x2} ${y2}`}
                      dur="1.8s"
                      repeatCount="indefinite"
                      keyPoints="0;1"
                      keyTimes="0;1"
                      calcMode="linear"
                    />
                  </circle>
                  {/* Animated traveling data particle inwards */}
                  <circle r="3.5" fill="#a78bfa">
                    <animateMotion
                      path={`M ${x2} ${y2} L ${center} ${center}`}
                      dur="2.4s"
                      repeatCount="indefinite"
                      keyPoints="0;1"
                      keyTimes="0;1"
                      calcMode="linear"
                    />
                  </circle>
                </g>
              );
            }

            // Inactive / upcoming portal line
            return (
              <line
                key={`line-${node.id}`}
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="rgba(255, 255, 255, 0.22)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            );
          })}
        </svg>

        {/* Center Node: MIS CORE */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-28 h-28 rounded-full z-20 shadow-[0_0_35px_rgba(139,110,240,0.7)] border-3 border-white/90"
          style={{
            background: "radial-gradient(circle at 35% 35%, #6d44d0 0%, #3a1c8b 80%, #291269 100%)",
          }}
        >
          {/* Animated pulsing halo behind MIS CORE */}
          <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-25 pointer-events-none" />
          <div className="absolute -inset-1.5 rounded-full border border-purple-300/40 pointer-events-none" />

          <span className="text-white font-extrabold font-display text-xl tracking-wider drop-shadow-md">
            MIS
          </span>
          <span className="text-[11px] font-semibold text-purple-200 tracking-widest uppercase mt-0.5 opacity-90">
            CORE
          </span>
        </div>

        {/* Surrounding Nodes HTML Overlay for perfect typography and styling */}
        {PORTAL_NODES.map((node) => {
          const angleRad = (node.angleDeg * Math.PI) / 180;
          // Percentage coordinates inside container (0% to 100%)
          const xPercent = 50 + (radius / viewBoxSize) * 100 * Math.cos(angleRad);
          const yPercent = 50 + (radius / viewBoxSize) * 100 * Math.sin(angleRad);

          return (
            <div
              key={`node-${node.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20"
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
              }}
            >
              {node.isLive ? (
                /* Active / Live Node */
                <div className="relative group cursor-default">
                  {/* Subtle pulsing background ring */}
                  <div className="absolute -inset-1 rounded-full bg-white/30 blur-sm animate-pulse" />

                  <div className="relative flex flex-col items-center justify-center w-[84px] h-[84px] sm:w-[90px] sm:h-[90px] rounded-full bg-white text-primary border-2 border-white shadow-[0_4px_22px_rgba(255,255,255,0.45)] transition-transform duration-300 hover:scale-105">
                    {/* Live green/violet active badge indicator */}
                    <div className="absolute -top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping mr-0.5" />
                      LIVE
                    </div>

                    <span className="font-display font-bold text-[12px] sm:text-[13px] text-slate-900 text-center leading-tight px-1">
                      {node.name}
                    </span>
                  </div>
                </div>
              ) : (
                /* Inactive / Upcoming Node */
                <div className="relative group opacity-85 cursor-default">
                  <div className="flex flex-col items-center justify-center w-[76px] h-[76px] sm:w-[82px] sm:h-[82px] rounded-full bg-white/18 backdrop-blur-md text-white/80 border border-white/25 shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-transform duration-300 hover:scale-105">
                    <span className="font-display font-medium text-[11px] sm:text-[12px] text-white/90 text-center leading-tight px-1">
                      {node.name}
                    </span>
                    <span className="text-[9px] text-white/60 mt-0.5">Soon</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend below graph */}
      <div className="mt-4 flex items-center justify-center gap-5 text-xs text-white/80 bg-black/15 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="font-medium text-white">Live Data Exchange</span>
        </div>
        <div className="h-3 w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/40" />
          <span className="text-white/70">Connected Modules</span>
        </div>
      </div>
    </div>
  );
}
