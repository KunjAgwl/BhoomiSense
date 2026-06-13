import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Initialize Lenis smooth scroll once at the root (Section 2) and drive it from
 * GSAP's ticker so ScrollTrigger and Lenis share a single RAF loop (avoids
 * jitter between the pinned hero and smooth scrolling).
 */
export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    // Keep ScrollTrigger in sync with Lenis.
    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time) => {
      // GSAP ticker time is in seconds; Lenis expects ms.
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}
