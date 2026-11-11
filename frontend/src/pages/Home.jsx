import { motion } from "motion/react";
import {
  AtSign, Ban, CalendarDays, Clock, Dice5, GlassWater, PartyPopper, Shirt, UtensilsCrossed, Volume2, Wine,
} from "lucide-react";
import Diya from "../components/Diya.jsx";
import Fireworks from "../components/Fireworks.jsx";
import Rangoli from "../components/Rangoli.jsx";
import Reveal from "../components/Reveal.jsx";
import { siteConfig } from "../config/siteConfig.js";
import { useMotionPrefs } from "../hooks/useMotionPrefs.js";

const ICONS = {
  party: PartyPopper, shirt: Shirt, wine: Wine, glass: GlassWater, food: UtensilsCrossed,
  clock: Clock, dice: Dice5, volume: Volume2, tag: AtSign, ban: Ban,
};

/** Highlights the `strong` phrase inside `text` in gold. */
function Emphasis({ text, strong }) {
  if (!strong || !text.includes(strong)) return text;
  const [before, after] = text.split(strong);
  return (
    <>
      {before}
      <strong className="font-semibold text-secondary">{strong}</strong>
      {after}
    </>
  );
}

function FloatingDiyas() {
  const { reduced, isMobile } = useMotionPrefs();
  if (reduced) return null;
  const diyas = isMobile ? [8, 85] : [6, 22, 78, 92];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {diyas.map((left, i) => (
        <motion.div
          key={left}
          className="absolute bottom-[-80px]"
          style={{ left: `${left}%` }}
          animate={{ y: [0, -620], x: [0, i % 2 ? 18 : -18, 0], opacity: [0, 0.85, 0.85, 0] }}
          transition={{ duration: 16 + i * 3, repeat: Infinity, delay: i * 4, ease: "linear" }}
        >
          <Diya size={34} glow={false} delay={i * 0.3} />
        </motion.div>
      ))}
    </div>
  );
}

export default function Home() {
  const { event, home } = siteConfig;
  return (
    <div className="space-y-14 sm:space-y-20">
      {/* ---------- Hero ---------- */}
      <section className="relative flex min-h-[70dvh] flex-col items-center justify-center text-center">
        <Rangoli className="h-[420px] w-[420px] sm:h-[620px] sm:w-[620px]" opacity={0.2} />
        <Fireworks auto className="absolute inset-0 h-full w-full" />
        <FloatingDiyas />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-third-soft sm:text-sm"
        >
          You are invited to
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-shimmer relative px-2 text-[2.6rem] font-black leading-[1.05] sm:text-6xl md:text-7xl"
        >
          {event.title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="relative mt-6 flex items-end gap-2 sm:gap-4"
          aria-hidden="true"
        >
          <Diya size={40} delay={0.6} />
          <Diya size={54} delay={0.2} />
          <Diya size={72} />
          <Diya size={54} delay={0.4} />
          <Diya size={40} delay={0.8} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="relative mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink">
            <CalendarDays size={16} className="text-secondary" aria-hidden="true" /> {event.dateShort}
          </span>
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink">
            <Clock size={16} className="text-secondary" aria-hidden="true" /> {event.timeText} onwards
          </span>
        </motion.div>
      </section>

      {/* ---------- Big Happy Diwali message ---------- */}
      <Reveal as="section" className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-shimmer text-4xl font-black leading-tight sm:text-5xl md:text-6xl">{home.greetingHeading}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/90 sm:text-xl">{home.greeting}</p>
      </Reveal>

      {/* ---------- Invitation ---------- */}
      <Reveal as="section" className="card-royal relative mx-auto max-w-3xl overflow-hidden rounded-3xl p-7 text-center sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-third/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" aria-hidden="true" />
        <p className="relative text-lg font-semibold leading-relaxed text-ink sm:text-2xl">{home.invite}</p>
        <p className="relative mt-5 text-sm italic text-secondary/90 sm:text-base">{home.rsvpNote}</p>
      </Reveal>

      {/* ---------- Basic information ---------- */}
      <section className="relative">
        <Reveal className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-secondary sm:text-4xl">{home.infoHeading}</h2>
          <div className="mx-auto mt-3 h-px w-40 bg-[linear-gradient(90deg,transparent,var(--color-secondary),transparent)]" aria-hidden="true" />
        </Reveal>
        <ol className="grid gap-4 sm:grid-cols-2">
          {home.infoItems.map((item, i) => {
            const Icon = ICONS[item.icon] || PartyPopper;
            return (
              <Reveal key={item.text} as="li" delay={Math.min(i * 0.06, 0.4)} className="h-full">
                <motion.div
                  whileHover={{ y: -4, boxShadow: "var(--shadow-glow)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="card-royal flex h-full items-start gap-4 rounded-2xl p-5"
                >
                  <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-secondary-soft),var(--color-secondary-deep))] text-primary-deeper shadow-glow-gold">
                    <Icon size={22} aria-hidden="true" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary-deeper text-xs font-bold text-secondary ring-1 ring-secondary/60">
                      {i + 1}
                    </span>
                  </span>
                  <p className="leading-relaxed text-ink/90">
                    <Emphasis text={item.text} strong={item.strong} />
                  </p>
                </motion.div>
              </Reveal>
            );
          })}
        </ol>
      </section>

      <Reveal className="text-center">
        <p className="font-display text-lg text-secondary sm:text-2xl">See you on the {event.dateText} at {event.timeText}!</p>
      </Reveal>
    </div>
  );
}
