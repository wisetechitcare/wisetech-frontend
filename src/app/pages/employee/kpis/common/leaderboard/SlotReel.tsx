import React, { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";

export interface ReelFrame {
  avatar: string;
  name: string;
}

interface SlotReelProps {
  /** Reel content; the LAST frame MUST be the true winner (deterministic landing). */
  frames: ReelFrame[];
  /** Height of a single frame window in px (avatar + name). */
  itemHeight: number;
  avatarSize: number;
  /** Total spin duration until the reel lands on the winner. */
  durationMs: number;
  /** Flip true to run the spin exactly once. */
  start: boolean;
  /** Skip animation entirely (reduced motion / static podium) and show the winner. */
  reduced: boolean;
  /** When false, the reel shows only the avatar (no name label). */
  showName?: boolean;
  onLanded?: () => void;
}

/**
 * One podium slot's slot-machine reel. A tall vertical strip of candidate faces
 * translates upward with an ease-out tween so it reads as "fast then slow",
 * landing on the final frame (the winner). Blur clears as it settles.
 */
const SlotReel: React.FC<SlotReelProps> = ({
  frames,
  itemHeight,
  avatarSize,
  durationMs,
  start,
  reduced,
  showName = true,
  onLanded,
}) => {
  const controls = useAnimationControls();
  const cancelledRef = useRef(false);
  const landedRef = useRef(false);
  const finalY = -(Math.max(frames.length - 1, 0) * itemHeight);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (frames.length === 0) return;

    // Static: reduced motion or not started → rest on the winner immediately.
    if (reduced || !start) {
      controls.set({ y: finalY, filter: "blur(0px)" });
      if (start && !landedRef.current) {
        landedRef.current = true;
        onLanded?.();
      }
      return;
    }

    landedRef.current = false;
    let active = true;

    (async () => {
      controls.set({ y: 0, filter: "blur(2.5px)" });
      try {
        await controls.start({
          y: finalY,
          filter: "blur(0px)",
          transition: { duration: durationMs / 1000, ease: [0.12, 0.8, 0.2, 1] },
        });
      } catch {
        /* animation interrupted (unmount / restart) */
      }
      if (active && !cancelledRef.current && !landedRef.current) {
        landedRef.current = true;
        onLanded?.();
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, reduced, durationMs, finalY, frames.length]);

  return (
    <div
      style={{
        height: itemHeight,
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <motion.div animate={controls} style={{ willChange: "transform" }}>
        {frames.map((f, i) => (
          <div
            key={i}
            style={{
              height: itemHeight,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "#F5F8FA",
                border: "2px solid #fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={f.avatar}
                alt={f.name}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            {showName && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#181C32",
                  maxWidth: avatarSize + 40,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {f.name}
              </div>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default React.memo(SlotReel);
