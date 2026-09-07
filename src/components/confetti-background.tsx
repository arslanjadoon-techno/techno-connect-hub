import React from "react";

interface ConfettiBackgroundProps {
  children: React.ReactNode;
}

export function ConfettiBackground({ children }: ConfettiBackgroundProps) {
  return (
    <div className="w-full relative min-h-screen">
      {/* Confetti Core Global Styles Injection */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                .global-confetti-bg {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    pointer-events: none;
                    z-index: 35;
                    overflow: hidden;
                }
                .global-confetti-piece {
                    position: absolute;
                    top: -25px;
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                    animation: globalContinuousFall linear infinite;
                    will-change: transform, opacity;
                }
                
                /* High Density Position, Colors & Infinite Staggered Rain */
                .global-confetti-piece:nth-child(1) { left: 2%; width: 10px; height: 12px; background-color: #f59e0b; animation-duration: 4.2s; animation-delay: -0.5s; }
                .global-confetti-piece:nth-child(2) { left: 5%; width: 8px; height: 14px; background-color: #3b82f6; animation-duration: 4.8s; animation-delay: -2.1s; }
                .global-confetti-piece:nth-child(3) { left: 8%; width: 12px; height: 8px; background-color: #ec4899; animation-duration: 3.6s; animation-delay: -1.2s; }
                .global-confetti-piece:nth-child(4) { left: 11%; width: 9px; height: 11px; background-color: #eab308; animation-duration: 5.1s; animation-delay: -3.4s; }
                .global-confetti-piece:nth-child(5) { left: 14%; width: 13px; height: 7px; background-color: #10b981; animation-duration: 4.4s; animation-delay: -0.8s; }
                .global-confetti-piece:nth-child(6) { left: 17%; width: 8px; height: 12px; background-color: #a855f7; animation-duration: 3.9s; animation-delay: -2.7s; }
                .global-confetti-piece:nth-child(7) { left: 20%; width: 11px; height: 10px; background-color: #06b6d4; animation-duration: 4.6s; animation-delay: -1.9s; }
                .global-confetti-piece:nth-child(8) { left: 23%; width: 14px; height: 8px; background-color: #f43f5e; animation-duration: 5.4s; animation-delay: -0.2s; }
                .global-confetti-piece:nth-child(9) { left: 26%; width: 7px; height: 13px; background-color: #f59e0b; animation-duration: 3.7s; animation-delay: -3.1s; }
                .global-confetti-piece:nth-child(10) { left: 29%; width: 10px; height: 10px; background-color: #3b82f6; animation-duration: 4.9s; animation-delay: -1.5s; }
                .global-confetti-piece:nth-child(11) { left: 32%; width: 12px; height: 9px; background-color: #14b8a6; animation-duration: 4.1s; animation-delay: -2.3s; }
                .global-confetti-piece:nth-child(12) { left: 35%; width: 8px; height: 14px; background-color: #eab308; animation-duration: 5.2s; animation-delay: -0.6s; }
                .global-confetti-piece:nth-child(13) { left: 38%; width: 11px; height: 7px; background-color: #ec4899; animation-duration: 3.8s; animation-delay: -3.6s; }
                .global-confetti-piece:nth-child(14) { left: 41%; width: 13px; height: 11px; background-color: #a855f7; animation-duration: 4.5s; animation-delay: -1.1s; }
                .global-confetti-piece:nth-child(15) { left: 44%; width: 9px; height: 12px; background-color: #10b981; animation-duration: 4.0s; animation-delay: -2.9s; }
                .global-confetti-piece:nth-child(16) { left: 47%; width: 12px; height: 8px; background-color: #f59e0b; animation-duration: 5.0s; animation-delay: -0.4s; }
                .global-confetti-piece:nth-child(17) { left: 50%; width: 8px; height: 13px; background-color: #06b6d4; animation-duration: 3.5s; animation-delay: -1.8s; }
                .global-confetti-piece:nth-child(18) { left: 53%; width: 14px; height: 9px; background-color: #ef4444; animation-duration: 4.7s; animation-delay: -3.3s; }
                .global-confetti-piece:nth-child(19) { left: 56%; width: 10px; height: 10px; background-color: #eab308; animation-duration: 4.3s; animation-delay: -0.9s; }
                .global-confetti-piece:nth-child(20) { left: 59%; width: 11px; height: 12px; background-color: #3b82f6; animation-duration: 5.3s; animation-delay: -2.5s; }
                .global-confetti-piece:nth-child(21) { left: 62%; width: 7px; height: 14px; background-color: #ec4899; animation-duration: 3.9s; animation-delay: -1.4s; }
                .global-confetti-piece:nth-child(22) { left: 65%; width: 12px; height: 8px; background-color: #10b981; animation-duration: 4.8s; animation-delay: -3.0s; }
                .global-confetti-piece:nth-child(23) { left: 68%; width: 9px; height: 11px; background-color: #f59e0b; animation-duration: 4.2s; animation-delay: -0.3s; }
                .global-confetti-piece:nth-child(24) { left: 71%; width: 13px; height: 7px; background-color: #a855f7; animation-duration: 5.5s; animation-delay: -2.0s; }
                .global-confetti-piece:nth-child(25) { left: 74%; width: 8px; height: 12px; background-color: #06b6d4; animation-duration: 3.6s; animation-delay: -3.7s; }
                .global-confetti-piece:nth-child(26) { left: 77%; width: 11px; height: 10px; background-color: #f43f5e; animation-duration: 4.4s; animation-delay: -1.0s; }
                .global-confetti-piece:nth-child(27) { left: 80%; width: 14px; height: 8px; background-color: #eab308; animation-duration: 4.9s; animation-delay: -2.4s; }
                .global-confetti-piece:nth-child(28) { left: 83%; width: 9px; height: 13px; background-color: #3b82f6; animation-duration: 3.8s; animation-delay: -0.7s; }
                .global-confetti-piece:nth-child(29) { left: 86%; width: 12px; height: 9px; background-color: #14b8a6; animation-duration: 5.1s; animation-delay: -2.8s; }
                .global-confetti-piece:nth-child(30) { left: 89%; width: 8px; height: 14px; background-color: #ec4899; animation-duration: 4.1s; animation-delay: -1.6s; }
                .global-confetti-piece:nth-child(31) { left: 92%; width: 11px; height: 8px; background-color: #f59e0b; animation-duration: 4.6s; animation-delay: -3.5s; }
                .global-confetti-piece:nth-child(32) { left: 95%; width: 13px; height: 11px; background-color: #a855f7; animation-duration: 3.7s; animation-delay: -0.1s; }
                .global-confetti-piece:nth-child(33) { left: 98%; width: 8px; height: 10px; background-color: #10b981; animation-duration: 5.2s; animation-delay: -2.2s; }
                .global-confetti-piece:nth-child(34) { left: 4%; width: 12px; height: 7px; background-color: #eab308; animation-duration: 4.0s; animation-delay: -1.7s; }
                .global-confetti-piece:nth-child(35) { left: 16%; width: 9px; height: 12px; background-color: #06b6d4; animation-duration: 4.7s; animation-delay: -3.2s; }
                .global-confetti-piece:nth-child(36) { left: 27%; width: 10px; height: 10px; background-color: #f43f5e; animation-duration: 3.9s; animation-delay: -0.8s; }
                .global-confetti-piece:nth-child(37) { left: 39%; width: 13px; height: 8px; background-color: #f59e0b; animation-duration: 5.3s; animation-delay: -2.6s; }
                .global-confetti-piece:nth-child(38) { left: 51%; width: 8px; height: 13px; background-color: #3b82f6; animation-duration: 4.3s; animation-delay: -1.3s; }
                .global-confetti-piece:nth-child(39) { left: 63%; width: 11px; height: 9px; background-color: #10b981; animation-duration: 4.8s; animation-delay: -3.8s; }
                .global-confetti-piece:nth-child(40) { left: 75%; width: 14px; height: 9px; background-color: #ec4899; animation-duration: 3.6s; animation-delay: -0.5s; }
                .global-confetti-piece:nth-child(41) { left: 87%; width: 9px; height: 12px; background-color: #a855f7; animation-duration: 5.0s; animation-delay: -2.1s; }
                .global-confetti-piece:nth-child(42) { left: 94%; width: 12px; height: 8px; background-color: #eab308; animation-duration: 4.2s; animation-delay: -1.8s; }

                @keyframes globalContinuousFall {
                    0% {
                        transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
                        opacity: 0.9;
                    }
                    25% {
                        opacity: 0.95;
                        transform: translateY(28vh) rotateX(240deg) rotateY(180deg) rotateZ(180deg);
                    }
                    50% {
                        opacity: 0.9;
                        transform: translateY(55vh) rotateX(480deg) rotateY(360deg) rotateZ(360deg);
                    }
                    75% {
                        opacity: 0.85;
                        transform: translateY(82vh) rotateX(720deg) rotateY(540deg) rotateZ(540deg);
                    }
                    100% {
                        transform: translateY(115vh) rotateX(960deg) rotateY(720deg) rotateZ(720deg);
                        opacity: 0;
                    }
                }
                `,
        }}
      />

      {/* Shower Particle Layer */}
      <div className="global-confetti-bg">
        {Array.from({ length: 42 }).map((_, idx) => (
          <div key={idx} className="global-confetti-piece" />
        ))}
      </div>

      {/* Children Elements Render Inside Layout Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
