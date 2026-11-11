import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Copies `text` to the clipboard (with a fallback) and shows an animated "Copied!" toast. */
export default function CopyButton({ text, label = "Copy link", className = "", compact = false }) {
  const [state, setState] = useState("idle"); // idle | copied | failed

  useEffect(() => {
    if (state === "idle") return undefined;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  const onClick = async () => {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    if (!ok) window.prompt("Copy this link:", text);
  };

  return (
    <span className={`relative inline-flex ${className}`}>
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03 }}
        className={`btn-outline ${compact ? "px-3 py-2 text-sm" : ""}`}
        aria-live="polite"
      >
        {state === "copied" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        <span>{state === "copied" ? "Copied!" : label}</span>
      </motion.button>
      <AnimatePresence>
        {state !== "idle" && (
          <motion.span
            role="status"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary-deeper shadow-glow-gold"
          >
            {state === "copied" ? "Copied!" : "Copy manually"}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
