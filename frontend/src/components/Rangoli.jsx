import { useMemo } from "react";

/**
 * Procedural rangoli / mandala in SVG, slowly rotating behind hero sections.
 * Built from theme colours only; `size` is the rendered diameter in px (or CSS width via className).
 */
export default function Rangoli({ className = "", opacity = 0.22, petals = 16 }) {
  const rings = useMemo(() => {
    const items = [];
    for (let i = 0; i < petals; i += 1) {
      items.push((360 / petals) * i);
    }
    return items;
  }, [petals]);

  return (
    <div className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`} aria-hidden="true" style={{ opacity }}>
      <svg viewBox="-100 -100 200 200" className="h-full w-full animate-spin-slow">
        <defs>
          <radialGradient id="rangoli-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-third)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="98" fill="none" stroke="var(--color-secondary)" strokeWidth="0.6" strokeDasharray="3 2" />
        <circle r="88" fill="none" stroke="var(--color-secondary)" strokeWidth="0.4" />
        <circle r="28" fill="url(#rangoli-core)" />
        {rings.map((deg) => (
          <g key={`outer-${deg}`} transform={`rotate(${deg})`}>
            <path d="M0 -88 C 10 -74, 10 -58, 0 -46 C -10 -58, -10 -74, 0 -88 Z" fill="var(--color-primary)" stroke="var(--color-secondary)" strokeWidth="0.8" />
            <path d="M0 -82 C 5 -72, 5 -60, 0 -52 C -5 -60, -5 -72, 0 -82 Z" fill="var(--color-third)" opacity="0.7" />
            <circle cy="-93" r="1.6" fill="var(--color-secondary-soft)" />
          </g>
        ))}
        <g className="animate-spin-slower" style={{ transformOrigin: "0 0" }}>
          {rings.slice(0, petals / 2).map((deg) => (
            <g key={`inner-${deg}`} transform={`rotate(${deg * 2 + 360 / petals})`}>
              <path d="M0 -50 C 7 -40, 7 -28, 0 -22 C -7 -28, -7 -40, 0 -50 Z" fill="var(--color-secondary)" opacity="0.85" />
              <path d="M0 -44 C 3 -38, 3 -30, 0 -26 C -3 -30, -3 -38, 0 -44 Z" fill="var(--color-primary)" />
            </g>
          ))}
        </g>
        <circle r="46" fill="none" stroke="var(--color-third)" strokeWidth="0.7" strokeDasharray="1.5 3" />
        <circle r="20" fill="none" stroke="var(--color-secondary)" strokeWidth="1" />
        <circle r="6" fill="var(--color-secondary)" />
        <circle r="2.5" fill="var(--color-third)" />
      </svg>
    </div>
  );
}
