import { useEffect, type RefObject } from "react";

type SavedOverflow = { el: HTMLElement; overflowX: string; overflowY: string };

const isScrollable = (v: string) => v === "auto" || v === "scroll";
export function useStickyThead(tableRef: RefObject<HTMLTableElement | null>, enabled = true) {
  useEffect(() => {
    const table = tableRef.current;
    if (!enabled || !table) return;

    const clipSupported = typeof CSS !== "undefined" && CSS.supports("overflow", "clip");
    let saved: SavedOverflow[] = [];
    let native = false;
    let frame = 0;

    const topBarHeight = () =>
      document.querySelector<HTMLElement>("header.sticky")?.offsetHeight ?? 0;

    const restoreAncestors = () => {
      saved.forEach((s) => {
        s.el.style.overflowX = s.overflowX;
        s.el.style.overflowY = s.overflowY;
      });
      saved = [];
    };

    // Returns true if every clipping/scrolling wrapper up to <main> could be
    // switched to `overflow: clip` without losing real scrolling.
    const clipAncestors = (): boolean => {
      restoreAncestors();
      if (!clipSupported) return false;
      const stop = table.closest("main");
      const targets: HTMLElement[] = [];
      for (
        let el = table.parentElement;
        el && el !== stop && el !== document.body;
        el = el.parentElement
      ) {
        const cs = getComputedStyle(el);
        const scrollX = isScrollable(cs.overflowX);
        const scrollY = isScrollable(cs.overflowY);
        const hidden = cs.overflowX === "hidden" || cs.overflowY === "hidden";
        if (!scrollX && !scrollY && !hidden) continue;
        if (scrollX && el.scrollWidth > el.clientWidth + 1) return false;
        if (scrollY && el.scrollHeight > el.clientHeight + 1) return false;
        targets.push(el);
      }
      saved = targets.map((el) => ({
        el,
        overflowX: el.style.overflowX,
        overflowY: el.style.overflowY,
      }));
      targets.forEach((el) => {
        el.style.overflowX = "clip";
        el.style.overflowY = "clip";
      });
      return true;
    };

    const applyFallbackShift = () => {
      frame = 0;
      const thead = table.tHead;
      if (native || !thead) return;
      const pinAt =
        document.querySelector<HTMLElement>("header.sticky")?.getBoundingClientRect().bottom ?? 0;
      const maxShift = Math.max(table.offsetHeight - thead.offsetHeight, 0);
      const shift = Math.min(Math.max(pinAt - table.getBoundingClientRect().top, 0), maxShift);
      thead.style.transform = shift > 0 ? `translateY(${shift}px)` : "";
    };

    const evaluate = () => {
      const thead = table.tHead;
      if (!thead) return;
      native = clipAncestors();
      thead.style.zIndex = "10";
      if (native) {
        thead.style.position = "sticky";
        thead.style.top = `${topBarHeight()}px`;
        thead.style.transform = "";
      } else {
        thead.style.position = "relative";
        thead.style.top = "";
        applyFallbackShift();
      }
    };

    const onScroll = () => {
      if (!native && !frame) frame = requestAnimationFrame(applyFallbackShift);
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", evaluate);
    // Row count / page size / data changes resize the table without a window resize.
    const resizeObserver = new ResizeObserver(() => evaluate());
    resizeObserver.observe(table);
    evaluate();

    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", evaluate);
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
      restoreAncestors();
      const thead = table.tHead;
      if (thead) {
        thead.style.position = "";
        thead.style.top = "";
        thead.style.zIndex = "";
        thead.style.transform = "";
      }
    };
  }, [tableRef, enabled]);
}
