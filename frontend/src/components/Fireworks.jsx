import { useEffect, useRef } from "react";
import { useMotionPrefs } from "../hooks/useMotionPrefs.js";

/** Resolve a CSS variable from :root so canvas drawing uses the theme tokens. */
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Lightweight canvas fireworks.
 *  - `auto`: launch a burst every few seconds (home page)
 *  - `trigger`: bump this number to fire a burst (upload success)
 */
export default function Fireworks({ auto = false, trigger = 0, className = "", intensity = 1 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ particles: [], raf: 0, colors: [] });
  const { budget, reduced } = useMotionPrefs();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return undefined;
    const ctx = canvas.getContext("2d");
    const state = stateRef.current;
    state.colors = [
      cssVar("--color-secondary", "#d4a431"),
      cssVar("--color-third", "#ff7a1a"),
      cssVar("--color-ink", "#fff7e6"),
      cssVar("--color-secondary-soft", "#e6c56e"),
    ];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const burst = (x, y) => {
      const count = Math.round(70 * budget * intensity);
      const color = state.colors[Math.floor(Math.random() * state.colors.length)];
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.6 + Math.random() * 3.2;
        state.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.012 + Math.random() * 0.012,
          size: 1.4 + Math.random() * 1.8,
          color: Math.random() < 0.8 ? color : state.colors[2],
        });
      }
    };
    state.burst = burst;

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      const { clientWidth: w, clientHeight: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      state.particles = state.particles.filter((p) => p.life > 0);
      for (const p of state.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.045 * dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= p.decay * dt;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + p.life * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);

    let autoTimer = 0;
    if (auto) {
      const schedule = () => {
        autoTimer = window.setTimeout(() => {
          if (!document.hidden) {
            const { clientWidth: w, clientHeight: h } = canvas;
            burst(w * (0.15 + Math.random() * 0.7), h * (0.15 + Math.random() * 0.45));
          }
          schedule();
        }, 1800 + Math.random() * 2600);
      };
      schedule();
    }

    return () => {
      cancelAnimationFrame(state.raf);
      clearTimeout(autoTimer);
      ro.disconnect();
      state.particles = [];
    };
  }, [auto, budget, intensity, reduced]);

  useEffect(() => {
    if (!trigger || reduced) return;
    const canvas = canvasRef.current;
    const burst = stateRef.current.burst;
    if (!canvas || !burst) return;
    const { clientWidth: w, clientHeight: h } = canvas;
    burst(w * 0.5, h * 0.4);
    setTimeout(() => burst(w * 0.3, h * 0.5), 180);
    setTimeout(() => burst(w * 0.7, h * 0.45), 340);
  }, [trigger, reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
