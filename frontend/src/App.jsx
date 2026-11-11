import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import FloatingNav from "./components/FloatingNav.jsx";
import Petals from "./components/Petals.jsx";
import Toran from "./components/Toran.jsx";
import Home from "./pages/Home.jsx";
import Gallery from "./pages/Gallery.jsx";
import Upload from "./pages/Upload.jsx";
import ThankYou from "./pages/ThankYou.jsx";
import Location from "./pages/Location.jsx";

const Admin = lazy(() => import("./pages/Admin.jsx"));

const pageVariants = {
  initial: { opacity: 0, y: 18, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.25 } },
};

export default function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      {/* Ambient layers */}
      <Petals />
      <Toran />

      {/* Page content: padded so the floating nav never covers it */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-20 pb-32 sm:px-6 md:pt-32 md:pb-16">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/location" element={<Location />} />
              <Route
                path="/admin"
                element={
                  <Suspense fallback={null}>
                    <Admin />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <FloatingNav />
    </div>
  );
}
