import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLocation } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

/**
 * Initialize Lenis smooth scroll — but ONLY on non-landing pages.
 * On "/" the GSAP ScrollTrigger pin handles all scrolling; Lenis fighting
 * it causes the "map stuck / can't scroll" bug.
 */
export function useLenis() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    // Skip Lenis entirely on the landing page — ScrollTrigger owns scroll there
    if (isLanding) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [isLanding]);
}
