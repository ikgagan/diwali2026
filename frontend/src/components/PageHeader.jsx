import { motion } from "motion/react";
import Rangoli from "./Rangoli.jsx";

/** Hero heading with a rotating rangoli behind it. Used on every page except Home (which has its own). */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="relative mb-8 flex flex-col items-center text-center sm:mb-10">
      <Rangoli className="h-[320px] w-[320px] sm:h-[420px] sm:w-[420px]" opacity={0.16} petals={12} />
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-shimmer relative text-3xl font-bold leading-tight sm:text-4xl md:text-5xl"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative mt-3 max-w-xl text-base text-ink/85 sm:text-lg"
        >
          {subtitle}
        </motion.p>
      )}
      {children}
    </header>
  );
}
