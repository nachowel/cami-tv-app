import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  computeHoldPercent,
  computeScrollDuration,
  getReducedMotion,
} from "./autoScrollingTextUtils.ts";

interface AutoScrollingTextProps {
  children: string;
  className?: string;
  speed?: number;
  pauseMs?: number;
  gapRem?: number;
}

function measureOverflow(el: HTMLElement | null): boolean {
  if (!el) {
    return false;
  }
  return el.scrollWidth > el.clientWidth + 1;
}

export function useOverflowRef(deps?: unknown[]): [
  React.RefObject<HTMLDivElement | null>,
  boolean,
] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    setOverflowing(measureOverflow(ref.current));
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    measure();
  }, deps ?? []);

  return [ref, overflowing];
}

export function AutoScrollingText({
  children,
  className,
  speed = 45,
  pauseMs = 2000,
  gapRem = 4,
}: AutoScrollingTextProps) {
  const scopeId = useId();
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const [overflowRef, overflowing] = useOverflowRef([children]);
  const reducedMotion = getReducedMotion();
  const shouldScroll = overflowing && !reducedMotion;

  const duration = computeScrollDuration({ textLength: children.length, speed, pauseMs });
  const holdPercent = computeHoldPercent({ textLength: children.length, speed, pauseMs });
  const animationName = `auto-scroll-${scopeId.replace(/:/g, "")}`;

  if (!shouldScroll) {
    return (
      <div
        ref={overflowRef}
        className={className}
        style={
          overflowing && reducedMotion
            ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
            : undefined
        }
      >
        <span>{children}</span>
      </div>
    );
  }

  const holdStart = holdPercent;
  const holdEnd = 100 - holdPercent;

  return (
    <>
      <style>{`
@keyframes ${animationName} {
  0%, ${holdStart}% { transform: translateX(0); }
  ${holdEnd}%, 100% { transform: translateX(-50%); }
}
`}</style>
      <div ref={overflowRef} className={`${className ?? ""} overflow-hidden`}>
        <span
          ref={innerRef}
          className="inline-block whitespace-nowrap"
          style={{
            animation: `${animationName} ${duration}s linear infinite`,
          }}
        >
          {children}
          <span style={{ paddingLeft: `${gapRem}rem` }} />
          {children}
        </span>
      </div>
    </>
  );
}