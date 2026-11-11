import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Shared knobs for every animated effect: reduced-motion flag and a mobile particle budget. */
export function useMotionPrefs() {
  const reduced = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const coarse = useMediaQuery("(pointer: coarse)");
  const lowPower = isMobile || coarse;
  return {
    reduced: Boolean(reduced),
    isMobile,
    /** Multiply particle counts by this. */
    budget: reduced ? 0 : lowPower ? 0.45 : 1,
  };
}

export default useMotionPrefs;
