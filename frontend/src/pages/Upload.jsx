import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, ImageIcon, Lock, RotateCcw, Sparkles, Upload as UploadIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Diya from "../components/Diya.jsx";
import DriveLinkCard from "../components/DriveLinkCard.jsx";
import Fireworks from "../components/Fireworks.jsx";
import PageHeader from "../components/PageHeader.jsx";
import WakeLoader from "../components/WakeLoader.jsx";
import { siteConfig } from "../config/siteConfig.js";
import { useMotionPrefs } from "../hooks/useMotionPrefs.js";
import { getConfig, PASSCODE_KEY, storage, uploadFile, verifyPasscode } from "../lib/api.js";

const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let nextId = 1;
const canPreview = (file) => /^image\/(jpeg|png|webp|gif)$/i.test(file.type);

/* ---------------- Passcode gate ---------------- */
function PasscodeGate({ onVerified }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await verifyPasscode(value.trim());
      storage.set(PASSCODE_KEY, value.trim());
      onVerified(value.trim());
    } catch (err) {
      setError(err.status === 401 ? "That passcode isn't right. Try again." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-royal mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl p-8 text-center"
    >
      <span className="rounded-full bg-secondary/15 p-3 text-secondary">
        <Lock size={26} aria-hidden="true" />
      </span>
      <h2 className="text-2xl font-bold text-secondary">{siteConfig.upload.passcodeTitle}</h2>
      <p className="text-sm text-ink/80">{siteConfig.upload.passcodeHint}</p>
      <label className="sr-only" htmlFor="passcode">Party passcode</label>
      <input
        id="passcode"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        inputMode="text"
        className="w-full rounded-full border border-secondary/50 bg-primary-deeper/60 px-5 py-3 text-center text-lg tracking-widest text-ink placeholder:text-ink/40 focus:border-third"
        placeholder="passcode"
      />
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm text-third-soft" role="alert">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <button type="submit" disabled={busy || !value.trim()} className="btn-gold btn-gold-hover disabled:opacity-60">
        {busy ? "Checking..." : "Continue"}
      </button>
    </motion.form>
  );
}

/* ---------------- Big upload button ---------------- */
function BigUploadButton({ onFiles, disabled }) {
  const inputRef = useRef(null);
  const { reduced } = useMotionPrefs();
  return (
    <div className="relative flex flex-col items-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-third/30 blur-3xl"
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="relative flex h-52 w-52 flex-col items-center justify-center gap-2 rounded-full border-4 border-secondary bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--color-primary)_75%,var(--color-third)),var(--color-primary-deep)_70%)] text-secondary shadow-[var(--shadow-glow),inset_0_0_40px_color-mix(in_srgb,var(--color-third)_25%,transparent)] disabled:opacity-60 sm:h-60 sm:w-60"
        aria-label={siteConfig.upload.buttonLabel}
      >
        <span className="pointer-events-none absolute inset-2 rounded-full border border-dashed border-secondary/50" aria-hidden="true" />
        <Diya size={56} />
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <UploadIcon size={20} aria-hidden="true" /> {siteConfig.upload.buttonLabel}
        </span>
        <span className="text-xs text-ink/75">tap to choose</span>
        {!reduced &&
          [0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="absolute text-secondary-soft"
              style={{ top: `${15 + i * 20}%`, left: i % 2 ? "8%" : "84%" }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4], rotate: [0, 90] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}
            >
              <Sparkles size={16} />
            </motion.span>
          ))}
      </motion.button>
    </div>
  );
}

/* ---------------- Queue item ---------------- */
function QueueItem({ item, onRetry, onRemove }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="card-royal flex items-center gap-3 rounded-2xl p-3"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-primary-deeper/60">
        {item.preview ? (
          <img src={item.preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto text-secondary/70" aria-hidden="true" />
        )}
        {item.status === "done" && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-primary-deeper/60 text-secondary">
            <Check size={26} strokeWidth={3} />
          </motion.span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.file.name}</p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary-deeper/70">
          <motion.div
            className={`h-full rounded-full ${item.status === "error" ? "bg-third" : "bg-[linear-gradient(90deg,var(--color-secondary),var(--color-third))]"}`}
            animate={{ width: `${item.status === "done" ? 100 : item.progress}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        </div>
        <p className="mt-1 text-xs text-ink/70">
          {item.status === "queued" && "Waiting..."}
          {item.status === "uploading" && (item.progress < 100 ? `Uploading ${item.progress}%` : "Saving to Drive...")}
          {item.status === "retrying" && `Retrying (${item.attempt}/${MAX_ATTEMPTS})...`}
          {item.status === "done" && "Uploaded"}
          {item.status === "error" && <span className="text-third-soft">{item.error}</span>}
        </p>
      </div>
      {item.status === "error" && (
        <button type="button" onClick={() => onRetry(item.id)} className="btn-outline min-h-11 px-3 py-2 text-sm" aria-label="Retry upload">
          <RotateCcw size={16} aria-hidden="true" /> Retry
        </button>
      )}
      {(item.status === "error" || item.status === "done" || item.status === "queued") && (
        <button type="button" onClick={() => onRemove(item.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-secondary/70 hover:text-third-soft" aria-label="Remove from list">
          <X size={18} />
        </button>
      )}
    </motion.li>
  );
}

/* ---------------- Page ---------------- */
export default function Upload() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [passcode, setPasscode] = useState(() => storage.get(PASSCODE_KEY) || "");
  const [queue, setQueue] = useState([]);
  const [bursts, setBursts] = useState(0);
  const workingRef = useRef(false);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(() => {
    getConfig({ onRetry: setAttempt })
      .then((c) => {
        setConfig(c);
        if (!c.passcode_required) setPasscode("");
      })
      .catch((err) => setConfigError(err.message));
  }, []);

  const patch = useCallback((id, changes) => {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...(typeof changes === "function" ? changes(it) : changes) } : it)));
  }, []);

  // Sequential worker: one file at a time, automatic retries with backoff.
  const pump = useCallback(async () => {
    if (workingRef.current) return;
    workingRef.current = true;
    try {
      for (;;) {
        const next = queueRef.current.find((it) => it.status === "queued");
        if (!next) break;
        let attemptNo = 0;
        for (;;) {
          attemptNo += 1;
          patch(next.id, { status: "uploading", progress: 0, attempt: attemptNo });
          try {
            await uploadFile(next.file, { passcode, onProgress: (p) => patch(next.id, { progress: p }) });
            patch(next.id, { status: "done", progress: 100 });
            setBursts((b) => b + 1);
            break;
          } catch (err) {
            if (err.status === 401) {
              storage.remove(PASSCODE_KEY);
              setPasscode("");
              patch(next.id, { status: "error", error: "Passcode expired, please enter it again" });
              break;
            }
            if (err.retryable && attemptNo < MAX_ATTEMPTS) {
              patch(next.id, { status: "retrying", attempt: attemptNo });
              await sleep(1200 * 2 ** (attemptNo - 1));
              continue;
            }
            patch(next.id, { status: "error", error: err.message || "Upload failed" });
            break;
          }
        }
      }
    } finally {
      workingRef.current = false;
    }
  }, [passcode, patch]);

  useEffect(() => {
    if (queue.some((it) => it.status === "queued")) pump();
  }, [queue, pump]);

  const addFiles = (files) => {
    const maxBytes = (config?.max_upload_mb ?? 25) * 1024 * 1024;
    const items = files.map((file) => {
      const tooBig = file.size > maxBytes;
      return {
        id: nextId++,
        file,
        preview: canPreview(file) ? URL.createObjectURL(file) : null,
        progress: 0,
        attempt: 0,
        status: tooBig ? "error" : "queued",
        error: tooBig ? `Larger than ${config?.max_upload_mb ?? 25} MB` : null,
      };
    });
    setQueue((q) => [...items, ...q]);
  };

  const retry = (id) => patch(id, { status: "queued", progress: 0, error: null });
  const remove = (id) =>
    setQueue((q) => {
      const item = q.find((it) => it.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return q.filter((it) => it.id !== id);
    });

  useEffect(() => () => queueRef.current.forEach((it) => it.preview && URL.revokeObjectURL(it.preview)), []);

  const done = queue.filter((it) => it.status === "done").length;
  const needsPasscode = config?.passcode_required && !passcode;

  return (
    <div className="space-y-12">
      <PageHeader title={siteConfig.upload.heading} subtitle={siteConfig.upload.subheading} />

      {!config && !configError && <WakeLoader attempt={attempt} />}
      {configError && !config && (
        <div className="card-royal mx-auto max-w-md rounded-3xl p-8 text-center text-ink/90">
          <AlertCircle className="mx-auto mb-3 text-third" aria-hidden="true" />
          {configError}
          <button type="button" onClick={() => window.location.reload()} className="btn-gold btn-gold-hover mt-5">Reload</button>
        </div>
      )}

      {config && needsPasscode && <PasscodeGate onVerified={setPasscode} />}

      {config && !needsPasscode && (
        <section className="relative">
          <Fireworks trigger={bursts} className="pointer-events-none absolute inset-x-0 -top-24 h-[420px] w-full" intensity={1.2} />
          <div className="relative flex flex-col items-center gap-6">
            <BigUploadButton onFiles={addFiles} />
            <p className="text-sm text-ink/70">JPEG, PNG, WebP or HEIC, up to {config.max_upload_mb} MB each. Select many at once.</p>
          </div>

          <AnimatePresence>
            {queue.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto mt-8 max-w-2xl">
                <div className="mb-3 flex items-center justify-between text-sm text-ink/80">
                  <span>
                    {done} of {queue.length} uploaded
                  </span>
                  {done === queue.length && done > 0 && (
                    <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 font-semibold text-secondary">
                      <Sparkles size={16} aria-hidden="true" /> All done, thank you!
                    </motion.span>
                  )}
                </div>
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {queue.map((item) => (
                      <QueueItem key={item.id} item={item} onRetry={retry} onRemove={remove} />
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      <DriveLinkCard link={config?.drive_folder_link} />
    </div>
  );
}
