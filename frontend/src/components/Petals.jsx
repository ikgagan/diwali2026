import { useEffect, useRef } from "react";
import { useMotionPrefs } from "../hooks/useMotionPrefs.js";

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Full-screen canvas of drifting marigold petals and gold sparkles behind every page. */
export default function Petals() {
  const ref = useRef(null);
  const { budget, reduced } = useMotionPrefs();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced || budget === 0) return undefined;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const petalColors = [cssVar("--color-third", "#ff7a1a"), cssVar("--color-secondary", "#d4a431"), cssVar("--color-third-soft", "#ffb07a")];
    const sparkColor = cssVar("--color-secondary-soft", "#e6c56e");
    const count = Math.round(34 * budget);
    const make = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : -20,
      r: 5 + Math.random() * 7,
      vy: 0.35 + Math.random() * 0.55,
      vx: -0.25 + Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      vr: (-0.5 + Math.random()) * 0.02,
      wobble: Math.random() * Math.PI * 2,
      spark: Math.random() < 0.3,
      color: petalColors[Math.floor(Math.random() * petalColors.length)],
    });
    let items = Array.from({ length: count }, () => make(true));

    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      if (!document.hidden) {
        ctx.clearRect(0, 0, w, h);
        for (const p of items) {
          p.wobble += 0.02 * dt;
          p.x += (p.vx + Math.sin(p.wobble) * 0.3) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          if (p.y > h + 30 || p.x < -30 || p.x > w + 30) Object.assign(p, make(false));
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          if (p.spark) {
            ctx.globalAlpha = 0.35 + 0.35 * Math.sin(p.wobble * 3);
            ctx.fillStyle = sparkColor;
            ctx.beginPath();
            ctx.arc(0, 0, p.r * 0.22, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      items = [];
    };
  }, [budget, reduced]);

  if (reduced || budget === 0) return null;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />;
}
