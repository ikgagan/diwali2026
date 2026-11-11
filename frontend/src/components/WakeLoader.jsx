import { motion } from "motion/react";
import Diya from "./Diya.jsx";

/** Shown while the free backend wakes from sleep (can take about a minute). */
export default function WakeLoader({ attempt = 0, message }) {
  const text =
    message ||
    (attempt === 0
      ? "Lighting the diyas..."
      : attempt < 3
        ? "Waking up the diyas... the server is stretching after a nap."
        : "Still waking up. Free hosting takes up to a minute, hang tight.");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card-royal mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-end gap-3">
        <Diya size={44} delay={0.2} />
        <Diya size={60} />
        <Diya size={44} delay={0.5} />
      </div>
      <p className="text-ink/90">{text}</p>
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-secondary"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
