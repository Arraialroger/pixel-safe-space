import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Distance in px the user must pull past to trigger refresh */
  threshold?: number;
  /** Resistance factor (0..1) — lower = harder to pull */
  resistance?: number;
}

/**
 * iOS-style pull-to-refresh.
 * Active only on mobile and when the document is scrolled to the top.
 * Renders a fixed spinner that fades/translates with the pull distance.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 70,
  resistance = 0.5,
}: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!isMobile) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      triggered.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      const eased = dy * resistance;
      setPull(eased);
      if (eased > threshold && !triggered.current) {
        triggered.current = true;
        haptic(15);
      } else if (eased <= threshold && triggered.current) {
        triggered.current = false;
      }
    };

    const onTouchEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pull > threshold && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isMobile, pull, refreshing, threshold, resistance, onRefresh]);

  if (!isMobile) return <>{children}</>;

  const progress = Math.min(1, pull / threshold);
  const showIndicator = pull > 4 || refreshing;

  return (
    <>
      <div
        aria-hidden={!showIndicator}
        className={cn(
          "fixed left-1/2 z-50 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/90 shadow-lg backdrop-blur transition-opacity",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: 12,
          transform: `translate(-50%, ${Math.min(pull, threshold + 10)}px)`,
        }}
      >
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className={cn(
              "h-4 w-4 transition-transform",
              progress >= 1 ? "rotate-180 text-primary" : "text-muted-foreground"
            )}
            style={{ opacity: 0.4 + progress * 0.6 }}
          />
        )}
      </div>
      {children}
    </>
  );
}
