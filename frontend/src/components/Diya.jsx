import { motion } from "motion/react";
import { useMotionPrefs } from "../hooks/useMotionPrefs.js";

/** A clay diya with a flickering flame. Pure SVG + theme colours; `size` is the width in px. */
export default function Diya({ size = 64, className = "", delay = 0, glow = true }) {
  const { reduced } = useMotionPrefs();
  const h = size * 0.95;
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: h }} aria-hidden="true">
      {glow && !reduced && (
        <motion.div
          className="absolute left-1/2 top-[18%] h-[55%] w-[55%] -translate-x-1/2 rounded-full bg-third blur-xl"
          animate={{ opacity: [0.35, 0.6, 0.4, 0.65, 0.35], scale: [1, 1.15, 0.95, 1.1, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay }}
        />
      )}
      <svg viewBox="0 0 64 60" width={size} height={h} className="relative">
        {/* flame */}
        <g style={{ transformOrigin: "32px 30px" }} className={reduced ? "" : "animate-flicker"}>
          <path d="M32 6c7 9 9.5 14.5 9.5 20 0 6-4.5 9.5-9.5 9.5S22.5 32 22.5 26c0-5.5 2.5-11 9.5-20z" fill="var(--color-third)" />
          <path d="M32 15c3.5 5.5 4.5 8.5 4.5 11.5 0 3.5-2 5.5-4.5 5.5s-4.5-2-4.5-5.5c0-3 1-6 4.5-11.5z" fill="var(--color-secondary-soft)" />
          <path d="M32 22c1.5 2.5 2 4 2 5.5 0 1.8-0.9 2.8-2 2.8s-2-1-2-2.8c0-1.5 0.5-3 2-5.5z" fill="var(--color-ink)" />
        </g>
        {/* wick */}
        <rect x="31" y="34" width="2" height="4" rx="1" fill="var(--color-primary-deeper)" />
        {/* bowl */}
        <path d="M10 38h44c0 9.5-9.5 16.5-22 16.5S10 47.5 10 38z" fill="var(--color-secondary)" />
        <path d="M10 38h44c-1 2.5-3 4.5-5.5 6H15.5C13 42.5 11 40.5 10 38z" fill="var(--color-secondary-deep)" />
        <path d="M7 35.5h50l-3 4.5H10z" fill="var(--color-secondary-soft)" />
        <ellipse cx="32" cy="37" rx="18" ry="2" fill="var(--color-third)" opacity="0.55" />
        {/* rim ornaments */}
        {[-12, -4, 4, 12].map((dx) => (
          <circle key={dx} cx={32 + dx} cy={47} r="1.3" fill="var(--color-primary)" opacity="0.7" />
        ))}
      </svg>
    </div>
  );
}
