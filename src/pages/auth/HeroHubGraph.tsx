import { motion, useReducedMotion } from "motion/react";

interface PortalNode {
  id: string;
  name: string;
  displayName?: string;
  angleDeg: number;
  isLive: boolean;
  statusLabel?: string;
}

const PORTAL_NODES: PortalNode[] = [
  { id: "commission", name: "Commission", angleDeg: 270, isLive: true, statusLabel: "Active" },
  { id: "leasing", name: "Leasing", angleDeg: 315, isLive: true, statusLabel: "Active" },
  { id: "ranker", name: "Ranker", angleDeg: 0, isLive: true, statusLabel: "Active" },
  { id: "reporting", name: "Reporting", angleDeg: 45, isLive: true, statusLabel: "Active" },
  {
    id: "surveillance",
    name: "Surveillance",
    displayName: "Surveillance",
    angleDeg: 90,
    isLive: true,
    statusLabel: "Active",
  },
  {
    id: "leave-mgmt",
    name: "Leave Management",
    displayName: "Leave Mgmt",
    angleDeg: 135,
    isLive: true,
    statusLabel: "Active",
  },
  { id: "ticketing", name: "Ticketing", angleDeg: 180, isLive: false, statusLabel: "Upcoming" },
  { id: "ChatApp", name: "ChatApp", angleDeg: 225, isLive: true, statusLabel: "Active" },
];

const VIEW = 420;
const C = VIEW / 2;
const RADIUS = 168;

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};

export function HeroHubGraph() {
  const reduceMotion = useReducedMotion();
  const liveCount = PORTAL_NODES.filter((n) => n.isLive).length;

  return (
    <div className="relative mx-auto flex w-full max-w-xs select-none flex-col items-center justify-center py-2 sm:max-w-sm xl:max-w-md">
      {/* Background radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.22),rgba(168,139,250,0.12)_60%,transparent)] blur-2xl"
      />

      <div
        role="img"
        aria-label={`MIS Core exchanging data with ${liveCount} live modules`}
        className="relative aspect-square w-full max-w-[300px] sm:max-w-[330px] xl:max-w-[360px]"
      >
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            {/* userSpaceOnUse keeps the glow visible on perfectly horizontal / vertical lines */}
            <filter
              id="glow-live"
              filterUnits="userSpaceOnUse"
              x="-20"
              y="-20"
              width={VIEW + 50}
              height={VIEW + 50}
            >
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer orbital ring */}
          <circle
            cx={C}
            cy={C}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Inner orbital ring */}
          <circle
            cx={C}
            cy={C}
            r={RADIUS * 0.75}
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1"
          />

          {/* Connecting lines */}
          {PORTAL_NODES.map((node, i) => {
            const { x: x2, y: y2 } = polar(node.angleDeg, RADIUS);

            if (!node.isLive) {
              return (
                <line
                  key={`line-${node.id}`}
                  x1={C}
                  y1={C}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.24)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              );
            }

            const out = `M ${C} ${C} L ${x2} ${y2}`;
            const back = `M ${x2} ${y2} L ${C} ${C}`;
            const delay = `${(i * 0.3).toFixed(1)}s`;

            return (
              <g key={`line-${node.id}`}>
                {/* Soft glow underlay */}
                <line
                  x1={C}
                  y1={C}
                  x2={x2}
                  y2={y2}
                  stroke="#c4b5fd"
                  strokeWidth="3"
                  strokeOpacity="0.55"
                  strokeLinecap="round"
                  filter="url(#glow-live)"
                />
                {/* Main line */}
                <line
                  x1={C}
                  y1={C}
                  x2={x2}
                  y2={y2}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.9"
                  strokeLinecap="round"
                />

                {!reduceMotion && (
                  <>
                    {/* Outgoing particle */}
                    <circle r="4.5" fill="#ffffff" filter="url(#glow-live)">
                      <animateMotion
                        path={out}
                        dur="1.8s"
                        begin={delay}
                        repeatCount="indefinite"
                        calcMode="linear"
                      />
                    </circle>
                    {/* Incoming particle */}
                    <circle r="2.5" fill="#a78bfa">
                      <animateMotion
                        path={back}
                        dur="2.4s"
                        begin={delay}
                        repeatCount="indefinite"
                        calcMode="linear"
                      />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Center node: MIS Core */}
        <div
          className="absolute left-1/2 top-1/2 z-20 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-white/90 shadow-[0_0_28px_rgba(139,110,240,0.6)]"
          style={{
            background: "radial-gradient(circle at 35% 30%, #7048d8 0%, #3a1c8b 75%, #291269 100%)",
          }}
        >
          {!reduceMotion && (
            <div className="pointer-events-none absolute inset-0 animate-ping rounded-full border border-white/50 opacity-20" />
          )}
          <div className="pointer-events-none absolute -inset-1.5 rounded-full border border-purple-300/35" />

          <span className="font-display text-[17px] font-extrabold leading-none tracking-wider text-white drop-shadow-md">
            MIS
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-widest text-purple-200">
            Core
          </span>
        </div>

        {/* Surrounding portal nodes */}
        {PORTAL_NODES.map((node, i) => {
          const { x, y } = polar(node.angleDeg, RADIUS);
          const label = node.displayName || node.name;

          return (
            <div
              key={`node-${node.id}`}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / VIEW) * 100}%`, top: `${(y / VIEW) * 100}%` }}
            >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 260, damping: 20 }}
                title={`${node.name} · ${node.statusLabel}`}
                className="cursor-default"
              >
                {node.isLive ? (
                  <div className="relative">
                    <div
                      className={`absolute -inset-1 rounded-full bg-white/25 blur-sm ${reduceMotion ? "" : "animate-pulse"}`}
                    />
                    <div className="relative flex h-[70px] w-[70px] sm:h-[80px] sm:w-[80px] flex-col items-center justify-center rounded-full border border-white bg-white shadow-[0_2px_18px_rgba(255,255,255,0.4)] transition-transform duration-300 hover:scale-105">
                      {" "}
                      {/* Live badge */}
                      <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-[3px] text-[7px] font-bold leading-none tracking-wide text-white shadow-sm ring-2 ring-white">
                        <span className="relative flex h-2 w-2">
                          {!reduceMotion && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          )}
                          <span className="relative inline-flex h-1 w-1 rounded-full bg-white" />
                        </span>
                        LIVE
                      </div>
                      <span className="px-1 pt-1 text-center font-display text-[10px] font-semibold leading-tight text-slate-900 sm:text-[11px]">
                        {label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full border border-dashed border-white/40 bg-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.15)] backdrop-blur-md transition-transform duration-300 hover:scale-105 sm:h-[66px] sm:w-[66px]">
                    <span className="px-1.5 text-center font-display text-[10px] font-medium leading-tight text-white/90 sm:text-[11px]">
                      {label}
                    </span>
                    <span className="mt-0.5 text-[8px] leading-none text-white/65">Soon</span>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 rounded-full border border-white/10 bg-black/15 px-4 py-1.5 text-[11px] text-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="font-medium text-white">Live data exchange</span>
        </div>
        <div className="h-3 w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="text-white/70">Connected modules</span>
        </div>
      </div>
    </div>
  );
}
