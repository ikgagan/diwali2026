import { motion } from "motion/react";
import { CalendarClock, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import Diya from "./Diya.jsx";
import Rangoli from "./Rangoli.jsx";
import { siteConfig } from "../config/siteConfig.js";

const UNITS = [
  ["days", 86400],
  ["hours", 3600],
  ["minutes", 60],
  ["seconds", 1],
];

function split(seconds) {
  let rest = Math.max(0, Math.floor(seconds));
  return UNITS.map(([label, size]) => {
    const value = Math.floor(rest / size);
    rest -= value * size;
    return { label, value };
  });
}

/**
 * Full-page "opens later" screen with a live countdown to `unlockAt` (epoch ms).
 * The parent re-renders with the real content once the moment passes.
 */
export default function CountdownLock({ unlockAt, now }) {
  const { thankYou } = siteConfig;
  const parts = split((unlockAt - now) / 1000);

  return (
    <section className="relative flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <Rangoli className="h-[420px] w-[420px] sm:h-[600px] sm:w-[600px]" opacity={0.18} />

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
        className="relative mb-5 rounded-full bg-[linear-gradient(135deg,var(--color-secondary-soft),var(--color-secondary-deep))] p-4 text-primary-deeper shadow-glow-gold"
        aria-hidden="true"
      >
        <Lock size={30} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="text-shimmer relative px-2 text-4xl font-black leading-tight sm:text-5xl md:text-6xl"
      >
        {thankYou.lockedHeading}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink/90 sm:text-lg"
      >
        {thankYou.lockedText}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="card-royal relative mt-8 w-full max-w-md rounded-3xl p-5 sm:p-7"
        role="timer"
        aria-live="off"
        aria-label={`Opens in ${parts.map((p) => `${p.value} ${p.label}`).join(", ")}`}
      >
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {parts.map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-primary-deeper/60 px-1 py-3 ring-1 ring-secondary/30 sm:py-4">
              <div className="font-display text-2xl font-bold tabular-nums text-secondary sm:text-4xl">
                {String(value).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-ink/70 sm:text-xs">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-secondary sm:text-base">
          <CalendarClock size={18} aria-hidden="true" />
          {thankYou.lockedUnlockLine.replace("{when}", thankYou.unlockAtText)}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative mt-8 flex items-end gap-3"
        aria-hidden="true"
      >
        <Diya size={40} delay={0.3} />
        <Diya size={54} />
        <Diya size={40} delay={0.7} />
      </motion.div>
    </section>
  );
}

/** Ticks once a second; returns the current epoch ms. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
