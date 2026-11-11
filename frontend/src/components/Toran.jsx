import { useMemo } from "react";

/** Hanging toran (bunting with bells) swaying across the top of every page. */
export default function Toran() {
  const flags = useMemo(() => Array.from({ length: 26 }, (_, i) => i), []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 origin-top animate-sway" aria-hidden="true">
      <svg viewBox="0 0 1040 60" preserveAspectRatio="none" className="h-10 w-full sm:h-12">
        <path d="M0 6 Q 520 34 1040 6" fill="none" stroke="var(--color-secondary)" strokeWidth="3" />
        <path d="M0 6 Q 520 34 1040 6" fill="none" stroke="var(--color-third)" strokeWidth="1" strokeDasharray="2 6" />
        {flags.map((i) => {
          const x = i * 40 + 20;
          const t = x / 1040;
          const y = 6 + Math.sin(Math.PI * t) * 14;
          const even = i % 2 === 0;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M-14 0 L14 0 L0 26 Z" fill={even ? "var(--color-third)" : "var(--color-secondary)"} stroke="var(--color-secondary-soft)" strokeWidth="0.8" />
              <path d="M-8 0 L8 0 L0 14 Z" fill={even ? "var(--color-secondary)" : "var(--color-primary)"} opacity="0.9" />
              {i % 3 === 1 && (
                <>
                  <line x1="0" y1="26" x2="0" y2="36" stroke="var(--color-secondary)" strokeWidth="1" />
                  <path d="M-5 36 Q0 30 5 36 L4 42 L-4 42 Z" fill="var(--color-secondary)" />
                  <circle cy="44" r="1.6" fill="var(--color-third)" />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
