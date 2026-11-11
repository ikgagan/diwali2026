import { motion } from "motion/react";
import { Heart, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Diya from "../components/Diya.jsx";
import DriveLinkCard from "../components/DriveLinkCard.jsx";
import Fireworks from "../components/Fireworks.jsx";
import Rangoli from "../components/Rangoli.jsx";
import Reveal from "../components/Reveal.jsx";
import { siteConfig } from "../config/siteConfig.js";
import { getConfig } from "../lib/api.js";

export default function ThankYou() {
  const { thankYou } = siteConfig;
  const [driveLink, setDriveLink] = useState(null);

  useEffect(() => {
    getConfig({ retries: 4 })
      .then((c) => setDriveLink(c.drive_folder_link || ""))
      .catch(() => setDriveLink(""));
  }, []);

  return (
    <div className="space-y-12">
      <section className="relative flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <Rangoli className="h-[420px] w-[420px] sm:h-[600px] sm:w-[600px]" opacity={0.18} />
        <Fireworks auto className="absolute inset-0 h-full w-full" intensity={0.8} />

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
          className="relative mb-5 rounded-full bg-[linear-gradient(135deg,var(--color-secondary-soft),var(--color-secondary-deep))] p-4 text-primary-deeper shadow-glow-gold"
          aria-hidden="true"
        >
          <Heart size={34} fill="currentColor" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-shimmer relative max-w-4xl px-2 text-3xl font-black leading-tight sm:text-5xl md:text-6xl"
        >
          {thankYou.heading}
        </motion.h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="relative mt-6 flex items-end gap-3" aria-hidden="true">
          <Diya size={44} delay={0.3} />
          <Diya size={60} />
          <Diya size={44} delay={0.7} />
        </motion.div>
      </section>

      <div className="mx-auto max-w-3xl space-y-6">
        {thankYou.paragraphs.map((p, i) => (
          <Reveal key={p} delay={i * 0.1}>
            <p className="text-center text-lg leading-relaxed text-ink/90 sm:text-2xl">{p}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="card-royal mx-auto max-w-3xl rounded-3xl p-7 text-center sm:p-10">
        <p className="text-lg font-semibold leading-relaxed text-secondary sm:text-xl">{thankYou.uploadNudge}</p>
        <Link to="/upload" className="btn-gold btn-gold-hover mt-6 text-lg">
          <Upload size={20} aria-hidden="true" /> {thankYou.uploadButton}
        </Link>
      </Reveal>

      {driveLink !== null && (
        <div className="mx-auto max-w-3xl">
          <DriveLinkCard link={driveLink} />
        </div>
      )}
    </div>
  );
}
