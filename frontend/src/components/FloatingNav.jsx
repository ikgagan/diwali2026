import { motion } from "motion/react";
import { Heart, Home, Images, MapPin, Upload } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/gallery", label: "Gallery", Icon: Images },
  { to: "/upload", label: "Upload", Icon: Upload },
  { to: "/thank-you", label: "Thank You", Icon: Heart },
  { to: "/location", label: "Location", Icon: MapPin },
];

/** Pill-shaped glass nav: bottom-centre on phones (thumb reach), top-centre on desktop. */
export default function FloatingNav() {
  const { pathname } = useLocation();
  const activePath = items.find((i) => i.to === pathname)?.to ?? null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3 md:top-5 md:bottom-auto"
    >
      <motion.ul
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.15 }}
        className="glass relative flex items-center gap-0.5 rounded-full p-1.5 shadow-[0_8px_40px_color-mix(in_srgb,black_45%,transparent),var(--shadow-glow-gold)]"
      >
        {items.map(({ to, label, Icon }) => {
          const active = activePath === to;
          return (
            <li key={to} className="relative">
              <NavLink
                to={to}
                aria-label={label}
                className={`relative flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 ${
                  active ? "text-primary-deeper" : "text-secondary hover:text-third-soft"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,var(--color-secondary-soft),var(--color-secondary),var(--color-secondary-deep))] shadow-glow-gold"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <motion.span whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }} className="relative z-10 flex items-center gap-1.5">
                  <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
                  {/* Label shows for the active item (icons only below 360px so five pills fit), all items on >= sm */}
                  <span className={`${active ? "hidden min-[360px]:inline" : "hidden sm:inline"} whitespace-nowrap`}>{label}</span>
                </motion.span>
              </NavLink>
            </li>
          );
        })}
      </motion.ul>
    </nav>
  );
}
