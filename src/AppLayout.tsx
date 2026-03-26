import { ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { gymImages } from "@/lib/gymImages";

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  /** Gym dashboard sets its own full-bleed photo per tab; avoid stacking a second image here (looks like two photos “meshed” in the center). */
  const gymDashboardRoute = location.pathname === "/gym" || location.pathname === "/";
  const routeBackground = useMemo(() => {
    if (location.pathname === "/login") return gymImages.loginHero;
    if (location.pathname === "/gym" || location.pathname === "/") return null;
    return gymImages.gymHeroMultan;
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait" initial={false}>
          {routeBackground ? (
            <motion.img
              key={routeBackground}
              src={routeBackground}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full w-full object-cover brightness-75 contrast-110"
            />
          ) : (
            <motion.div
              key="gym-dashboard-bg-slot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-0 bg-[#0a0c0b]"
              aria-hidden
            />
          )}
        </AnimatePresence>
        {/* Softer vignette on gym routes so tab photos aren’t framed like a second “lens” */}
        <div
          className={
            gymDashboardRoute
              ? "absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.5)_62%,rgba(0,0,0,0.78)_100%)]"
              : "absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.82)_100%)]"
          }
        />
        <div className="absolute inset-0 bg-scanlines opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,77,0,0.14),transparent_48%),radial-gradient(circle_at_82%_22%,rgba(255,195,0,0.1),transparent_55%)]" />
      </div>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

