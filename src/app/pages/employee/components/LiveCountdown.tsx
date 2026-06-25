import React, { useEffect, useState } from "react";

interface Props {
  /** ISO timestamp the grant expires at. */
  expiresAt: string;
  /** Fired once when the countdown crosses zero (optional). */
  onExpire?: () => void;
}

const fmt = (ms: number): string => {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  if (m || h || d) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return `${parts.join(" ")} left`;
};

/**
 * A self-ticking "time remaining" label. Updates every second and clears its
 * interval on unmount. Pure display — it does not mutate anything server-side.
 */
const LiveCountdown: React.FC<Props> = ({ expiresAt, onExpire }) => {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    setRemaining(new Date(expiresAt).getTime() - Date.now());
    let fired = false;
    const id = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const expired = remaining <= 0;
  return (
    <span
      className={`badge ${expired ? "badge-light-danger" : "badge-light-warning"} fs-9`}
      style={{ fontVariantNumeric: "tabular-nums" }}
      title={`Expires ${new Date(expiresAt).toLocaleString()}`}
    >
      <i className={`bi ${expired ? "bi-clock-history" : "bi-hourglass-split"} me-1`} />
      {fmt(remaining)}
    </span>
  );
};

export default LiveCountdown;
