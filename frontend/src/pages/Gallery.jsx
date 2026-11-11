import { AnimatePresence, motion } from "motion/react";
import { Camera, RefreshCw, Timer, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Diya from "../components/Diya.jsx";
import Lightbox from "../components/Lightbox.jsx";
import PageHeader from "../components/PageHeader.jsx";
import WakeLoader from "../components/WakeLoader.jsx";
import { siteConfig } from "../config/siteConfig.js";
import { absUrl, ADMIN_KEY, adminDelete, getGallery, storage } from "../lib/api.js";

function PhotoCard({ photo, index, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -10 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: index * 0.04 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      aria-label={`Open photo ${index + 1}`}
      className="card-royal group relative aspect-square overflow-hidden rounded-2xl p-1 focus-visible:outline-third"
    >
      {!loaded && <div className="skeleton absolute inset-1 rounded-xl" aria-hidden="true" />}
      <img
        src={absUrl(photo.thumb_url)}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full rounded-xl object-cover transition duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <span className="pointer-events-none absolute inset-1 rounded-xl ring-1 ring-inset ring-secondary/0 transition group-hover:ring-third/70" aria-hidden="true" />
    </motion.button>
  );
}

function formatCountdown(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function Gallery() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [now, setNow] = useState(() => Date.now() / 1000);
  const offsetRef = useRef(0); // server_time - client_time, keeps the countdown honest
  const adminToken = storage.get(ADMIN_KEY);

  const load = useCallback(async () => {
    try {
      const res = await getGallery({ onRetry: setAttempt });
      offsetRef.current = res.server_time - Date.now() / 1000;
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message || "Could not load the gallery");
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, siteConfig.gallery.refetchSeconds * 1000);
    const tick = setInterval(() => setNow(Date.now() / 1000), 1000);
    const onVisible = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Refetch right after the rotation boundary so everyone flips together.
  const remaining = data ? data.rotation_ends_at - (now + offsetRef.current) : null;
  useEffect(() => {
    if (remaining !== null && remaining < -0.5 && remaining > -3) load();
  }, [remaining, load]);

  const onDelete = adminToken
    ? async (photo) => {
        if (!window.confirm("Delete this photo from Drive for everyone?")) return;
        try {
          await adminDelete(adminToken, photo.id);
          setLightbox(null);
          load();
        } catch (err) {
          window.alert(err.message);
        }
      }
    : undefined;

  const photos = data?.photos ?? [];

  return (
    <div>
      <PageHeader
        title={siteConfig.gallery.heading}
        subtitle={siteConfig.gallery.subheading}
      >
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative mt-5 flex flex-wrap items-center justify-center gap-2 text-sm"
          >
            <span className="glass inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-ink/90">
              <Camera size={15} className="text-secondary" aria-hidden="true" /> {data.total} photo{data.total === 1 ? "" : "s"} so far
            </span>
            {data.total > photos.length && (
              <span className="glass inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 tabular-nums text-ink/90">
                <Timer size={15} className="text-secondary" aria-hidden="true" /> Next shuffle in {formatCountdown(remaining ?? 0)}
              </span>
            )}
            <button
              type="button"
              onClick={load}
              className="glass inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full px-3 py-2 text-secondary hover:text-third-soft"
              aria-label="Refresh gallery"
            >
              <RefreshCw size={15} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </PageHeader>

      {!data && !error && <WakeLoader attempt={attempt} />}

      {error && !data && (
        <div className="card-royal mx-auto max-w-md rounded-3xl p-8 text-center">
          <p className="text-ink/90">{error}</p>
          <button type="button" onClick={load} className="btn-gold btn-gold-hover mt-5">
            <RefreshCw size={18} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {data && photos.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-royal mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl p-8 text-center"
        >
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <Diya size={72} />
          </motion.div>
          <h2 className="text-2xl font-bold text-secondary">{siteConfig.gallery.emptyTitle}</h2>
          <p className="text-ink/85">{siteConfig.gallery.emptyText}</p>
          <Link to="/upload" className="btn-gold btn-gold-hover">
            <Upload size={18} aria-hidden="true" /> Upload a photo
          </Link>
        </motion.div>
      )}

      {photos.length > 0 && (
        <motion.ul layout className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {photos.map((photo, i) => (
              <li key={photo.id} className="contents">
                <PhotoCard photo={photo} index={i} onOpen={() => setLightbox(i)} />
              </li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} onNavigate={setLightbox} onDelete={onDelete} />
    </div>
  );
}
