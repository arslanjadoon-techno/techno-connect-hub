import React from "react";

interface ConfettiBackgroundProps {
    children: React.ReactNode;
}

export function ConfettiBackground({ children }: ConfettiBackgroundProps) {
    return (
        <div className="w-full relative overflow-hidden min-h-screen">
            {/* Confetti Core Global Styles Injection */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .global-confetti-bg {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    pointer-events: none;
                    z-index: 0;
                    overflow: hidden;
                }
                .global-confetti-piece {
                    position: absolute;
                    top: -20px;
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                    animation: globalFall linear infinite;
                }
                
                /* High Density Position & Timing Rules */
                .global-confetti-piece:nth-child(1) { left: 4%; width: 12px; height: 10px; background-color: #3b82f6; animation-duration: 4.5s; animation-delay: 0.2s; }
                .global-confetti-piece:nth-child(2) { left: 10%; width: 8px; height: 12px; background-color: #f59e0b; animation-duration: 5.2s; animation-delay: 1.1s; }
                .global-confetti-piece:nth-child(3) { left: 15%; width: 11px; height: 7px; background-color: #ec4899; animation-duration: 3.8s; animation-delay: 0s; }
                .global-confetti-piece:nth-child(4) { left: 22%; width: 14px; height: 9px; background-color: #10b981; animation-duration: 6.0s; animation-delay: 2.3s; }
                .global-confetti-piece:nth-child(5) { left: 28%; width: 9px; height: 11px; background-color: #a855f7; animation-duration: 4.1s; animation-delay: 0.7s; }
                .global-confetti-piece:nth-child(6) { left: 34%; width: 12px; height: 12px; background-color: #ef4444; animation-duration: 5.5s; animation-delay: 3.2s; }
                .global-confetti-piece:nth-child(7) { left: 39%; width: 7px; height: 10px; background-color: #06b6d4; animation-duration: 4.8s; animation-delay: 1.5s; }
                .global-confetti-piece:nth-child(8) { left: 45%; width: 13px; height: 8px; background-color: #eab308; animation-duration: 3.5s; animation-delay: 0.4s; }
                .global-confetti-piece:nth-child(9) { left: 52%; width: 10px; height: 13px; background-color: #14b8a6; animation-duration: 5.0s; animation-delay: 2.7s; }
                .global-confetti-piece:nth-child(10) { left: 58%; width: 11px; height: 9px; background-color: #f43f5e; animation-duration: 4.3s; animation-delay: 1.9s; }
                .global-confetti-piece:nth-child(11) { left: 63%; width: 9px; height: 11px; background-color: #3b82f6; animation-duration: 5.8s; animation-delay: 0.1s; }
                .global-confetti-piece:nth-child(12) { left: 69%; width: 12px; height: 7px; background-color: #10b981; animation-duration: 3.9s; animation-delay: 2.1s; }
                .global-confetti-piece:nth-child(13) { left: 74%; width: 8px; height: 12px; background-color: #f59e0b; animation-duration: 4.6s; animation-delay: 0.8s; }
                .global-confetti-piece:nth-child(14) { left: 80%; width: 14px; height: 10px; background-color: #ec4899; animation-duration: 5.2s; animation-delay: 3.5s; }
                .global-confetti-piece:nth-child(15) { left: 85%; width: 10px; height: 10px; background-color: #a855f7; animation-duration: 4.2s; animation-delay: 1.3s; }
                .global-confetti-piece:nth-child(16) { left: 91%; width: 11px; height: 13px; background-color: #06b6d4; animation-duration: 4.9s; animation-delay: 0.3s; }
                .global-confetti-piece:nth-child(17) { left: 96%; width: 7px; height: 9px; background-color: #ef4444; animation-duration: 3.7s; animation-delay: 2.6s; }
                .global-confetti-piece:nth-child(18) { left: 7%; width: 13px; height: 9px; background-color: #eab308; animation-duration: 5.4s; animation-delay: 3.8s; }
                .global-confetti-piece:nth-child(19) { left: 19%; width: 10px; height: 11px; background-color: #14b8a6; animation-duration: 4.0s; animation-delay: 1.7s; }
                .global-confetti-piece:nth-child(20) { left: 31%; width: 12px; height: 8px; background-color: #f43f5e; animation-duration: 4.7s; animation-delay: 0.5s; }
                .global-confetti-piece:nth-child(21) { left: 48%; width: 9px; height: 12px; background-color: #3b82f6; animation-duration: 5.1s; animation-delay: 3.1s; }
                .global-confetti-piece:nth-child(22) { left: 55%; width: 11px; height: 10px; background-color: #ec4899; animation-duration: 3.6s; animation-delay: 1.2s; }
                .global-confetti-piece:nth-child(23) { left: 66%; width: 8px; height: 14px; background-color: #10b981; animation-duration: 5.9s; animation-delay: 2.4s; }
                .global-confetti-piece:nth-child(24) { left: 78%; width: 13px; height: 7px; background-color: #a855f7; animation-duration: 4.4s; animation-delay: 0.9s; }
                .global-confetti-piece:nth-child(25) { left: 88%; width: 10px; height: 11px; background-color: #06b6d4; animation-duration: 4.0s; animation-delay: 4.1s; }

                @keyframes globalFall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.8; }
                    90% { opacity: 0.7; }
                    100% { transform: translateY(105vh) rotate(1080deg); opacity: 0; }
                }
                `}} />

            {/* Shower Particle Layer */}
            <div className="global-confetti-bg">
                {Array.from({ length: 25 }).map((_, idx) => (
                    <div key={idx} className="global-confetti-piece" />
                ))}
            </div>

            {/* Children Elements Render Inside Layout Content */}
            <div className="relative z-10 w-full">
                {children}
            </div>
        </div>
    );
}