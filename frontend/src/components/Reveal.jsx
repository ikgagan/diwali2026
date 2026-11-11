import { motion } from "motion/react";

/** Scroll-reveal wrapper: fades/slides children in when they enter the viewport. */
export default function Reveal({ children, delay = 0, className = "", as = "div", y = 24 }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Tag>
  );
}
