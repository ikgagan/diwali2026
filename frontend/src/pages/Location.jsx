import { motion } from "motion/react";
import { ExternalLink, Info, MapPin, MessageCircle, Phone } from "lucide-react";
import CopyButton from "../components/CopyButton.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import { siteConfig } from "../config/siteConfig.js";

export default function Location() {
  const loc = siteConfig.location;
  return (
    <div className="space-y-8">
      <PageHeader title={loc.heading} subtitle={loc.areaName} />

      {/* Map */}
      <Reveal className="card-royal map-frame overflow-hidden rounded-3xl p-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl sm:aspect-[16/8]">
          <iframe
            title={`Map of ${loc.areaName}`}
            src={loc.mapEmbedUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Reveal>

      {/* Address + links */}
      <Reveal className="card-royal rounded-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="mt-1 rounded-full bg-secondary/15 p-2.5 text-secondary">
            <MapPin size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-secondary sm:text-2xl">Address</h2>
            <address className="mt-1 text-lg not-italic leading-relaxed text-ink">
              {loc.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={loc.mapsLink} target="_blank" rel="noopener noreferrer" className="btn-gold btn-gold-hover">
            <ExternalLink size={18} aria-hidden="true" /> Open in Maps
          </a>
          <CopyButton text={loc.mapsLink} label="Copy Maps link" />
        </div>

        <div className="mt-6 flex gap-3 rounded-2xl border border-third/40 bg-third/10 p-4 text-sm leading-relaxed text-ink/90">
          <Info size={20} className="mt-0.5 shrink-0 text-third-soft" aria-hidden="true" />
          <p>{loc.mapsDisclaimer}</p>
        </div>
      </Reveal>

      {/* Contacts */}
      <Reveal className="card-royal rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-secondary sm:text-2xl">{loc.contactIntro}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {loc.contacts.map((c, i) => (
            <motion.li key={c.tel} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <a
                href={`tel:${c.tel}`}
                className="group flex items-center gap-3 rounded-2xl border border-secondary/30 bg-primary-deeper/40 p-4 transition hover:border-third hover:shadow-glow"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-secondary-soft),var(--color-secondary-deep))] text-primary-deeper">
                  <Phone size={20} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-secondary">{c.name}</span>
                  <span className="block text-sm tabular-nums text-ink/85">{c.phone}</span>
                </span>
              </a>
            </motion.li>
          ))}
        </ul>
        {loc.whatsapp && (
          <a
            href={loc.whatsapp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-secondary/30 bg-primary-deeper/40 p-4 transition hover:border-third hover:shadow-glow"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-third-soft),var(--color-third))] text-primary-deeper">
              <MessageCircle size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold text-secondary">{loc.whatsapp.name}</span>
              <span className="block text-sm tabular-nums text-ink/85">{loc.whatsapp.phone}</span>
            </span>
          </a>
        )}
      </Reveal>
    </div>
  );
}
