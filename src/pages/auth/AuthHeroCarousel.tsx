import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HeroHubGraph } from "./HeroHubGraph";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export function AuthHeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [timerKey, setTimerKey] = useState<number>(0);
  const totalSlides = 2;
  const slideIntervalMs = 10000; // 10 seconds per user requirement

  // Handler for manual slide selection that resets timer immediately
  const handleSelectSlide = (idx: number) => {
    setCurrentSlide(idx);
    setTimerKey((k) => k + 1);
  };

  const handlePrev = () => {
    handleSelectSlide((currentSlide - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    handleSelectSlide((currentSlide + 1) % totalSlides);
  };

  // Timer auto-rotates every 10 seconds and cleanly restarts on manual navigation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, slideIntervalMs);

    return () => clearInterval(timer);
  }, [currentSlide, timerKey]);

  return (
    <div className="relative z-10 w-full max-w-lg flex flex-col justify-center my-auto min-h-[440px]">
      <AnimatePresence mode="wait">
        {currentSlide === 0 ? (
          <motion.div
            key="slide-text"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90">
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Unified MIS Ecosystem</span>
            </div>

            <h1 className="font-display text-4xl lg:text-5xl font-semibold leading-[1.18] tracking-tight text-white">
              One platform for every portal, every team, every decision.
            </h1>

            <p className="text-white/85 text-base lg:text-lg leading-relaxed font-normal">
              Commission, Leasing, Ranker and more — unified inside a single MIS workspace with
              role-aware visibility and real-time collaboration.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="slide-graph"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center py-2"
          >
            <HeroHubGraph />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination & Manual Slide Controls */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                currentSlide === idx
                  ? "w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                  : "w-2 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
          <span className="text-[11px] text-white/70 ml-2 font-medium tracking-wide">
            {currentSlide === 0 ? "Overview" : "Live Portals Network"}
          </span>
        </div>

        {/* Prev / Next Manual Navigation */}
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/15">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition focus:outline-none cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-white/75 font-semibold px-1 select-none">
            {currentSlide + 1}/{totalSlides}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition focus:outline-none cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
