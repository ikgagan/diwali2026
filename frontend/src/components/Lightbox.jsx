import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { absUrl } from "../lib/api.js";

/**
 * Animated lightbox for the medium-size image.
 * `photos` is the current set; `index` the open one (null = closed).
 */
export default function Lightbox({ photos, index, onClose, onNavigate, onDelete }) {
  const open = index !== null && index !== undefined && photos[index];
  const photo = open ? photos[index] : null;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setLoaded(false), [photo?.id]);

  const go = useCallback(
    (dir) => {
      if (!open) return;
      const next = (index + dir + photos.length) % photos.length;
      onNavigate(next);
    },
    [index, onNavigate, open, photos.length]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose, open]);

  // Preload neighbours so swiping feels instant.
  useEffect(() => {
    if (!open || photos.length < 2) return;
    [1, -1].forEach((d) => {
      const p = photos[(index + d + photos.length) % photos.length];
      if (p) new Image().src = absUrl(p.medium_url);
    });
  }, [index, open, photos]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-primary-deeper)_88%,transparent)] p-3 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-5xl px-2 pt-6"
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            drag={photos.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(1);
              else if (info.offset.x > 80) go(-1);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-royal overflow-hidden rounded-2xl p-1.5">
              {!loaded && <div className="skeleton aspect-[4/3] w-full rounded-xl" />}
              <motion.img
                key={photo.id}
                src={absUrl(photo.medium_url)}
                alt="Party photo"
                onLoad={() => setLoaded(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: loaded ? 1 : 0 }}
                className={`mx-auto max-h-[72dvh] w-auto max-w-full rounded-xl object-contain select-none ${loaded ? "" : "absolute inset-0 h-0"}`}
                draggable={false}
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-0 right-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary-deeper shadow-glow-gold transition hover:bg-third"
            >
              <X size={22} />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="glass absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-secondary hover:text-third-soft"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="glass absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-secondary hover:text-third-soft"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            )}

            <div className="mt-3 flex items-center justify-between px-1 text-sm text-secondary/80">
              <span>
                {index + 1} / {photos.length}
              </span>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(photo)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-third/60 px-4 py-2 text-third-soft hover:bg-third/20"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
