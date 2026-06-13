import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../store/useStore';
import './ScrollHeroSection.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * ============================================================================
 *  CINEMATIC SCROLL EXPERIENCE — "Soil to Satellite" (5 real frames)
 * ----------------------------------------------------------------------------
 *  Phases (global scroll progress 0→1):
 *    A. SEQUENCE  (0    → 0.58) — 5 frames, eased crossfade + continuous zoom.
 *    B. HOLD      (0.58 → 0.72) — satellite locks, orbit HUD settles.
 *    C. REVEAL    (0.72 → 1.00) — dive through the satellite frame into the
 *                                 LIVE Esri satellite map underneath.
 *
 *  The hero is transparent and pointer-events:none so the fixed map shows
 *  through (and stays clickable) once the frames fade — no black overlay.
 * ============================================================================
 */

const STAGES = [
  { id: 'bhoomi1', src: '/images/bhoomi1.png', label: 'SOIL',      alt: '0.3 m' },
  { id: 'bhoomi2', src: '/images/bhoomi2.png', label: 'FIELD',     alt: '90 m' },
  { id: 'bhoomi3', src: '/images/bhoomi3.png', label: 'FARMLAND',  alt: '6 km' },
  { id: 'bhoomi4', src: '/images/bhoomi4.png', label: 'ORBIT',     alt: '320 km' },
  { id: 'bhoomi5', src: '/images/bhoomi5.png', label: 'SATELLITE', alt: '35,786 km' },
];

const SEQ_END = 0.58;
const HOLD_END = 0.72;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smootherstep = (x) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a, b, t) => a + (b - a) * t;

export default function ScrollHeroSection() {
  const pinRef = useRef(null);
  const stickyRef = useRef(null);
  const layerRefs = useRef([]);
  const heroTextRef = useRef(null);
  const chevronRef = useRef(null);
  const hudLabelRef = useRef(null);
  const hudAltRef = useRef(null);
  const railFillRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  const setRevealed = useStore((s) => s.setRevealed);

  // Preload the 5 frames before enabling the trigger.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      STAGES.map(
        (s) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = s.src;
          })
      )
    ).then(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const layers = layerRefs.current.filter(Boolean);
    if (layers.length !== STAGES.length) return;
    const mapEl = document.querySelector('.map-layer');
    const LAST = STAGES.length - 1;

    let revealedFlag = false;
    const setRevealedOnce = (v) => {
      if (v !== revealedFlag) {
        revealedFlag = v;
        setRevealed(v);
      }
    };

    const render = (p) => {
      // ---------- PHASE A: SEQUENCE ----------
      if (p <= SEQ_END) {
        const seqLocal = p / SEQ_END;
        const raw = seqLocal * LAST;
        const seg = Math.min(Math.floor(raw), LAST - 1);
        const t = smootherstep(raw - seg);
        const breathe = 1 + seqLocal * 0.05;

        layers.forEach((el, i) => {
          let opacity = 0;
          let scale = 1.18;
          if (i === seg) {
            opacity = 1 - t;
            scale = lerp(1, 1.14, t);
          } else if (i === seg + 1) {
            opacity = t;
            scale = lerp(1.18, 1, t);
          } else if (i < seg) {
            scale = 1.14;
          }
          el.style.opacity = opacity.toFixed(3);
          el.style.transform = `scale(${(scale * breathe).toFixed(4)})`;
        });

        if (stickyRef.current) stickyRef.current.style.opacity = '1';
        if (mapEl) {
          mapEl.style.opacity = '0';
          mapEl.style.transform = 'scale(1.1)';
        }
        setRevealedOnce(false);

        const stage = STAGES[Math.round(seqLocal * LAST)];
        if (hudLabelRef.current) hudLabelRef.current.textContent = stage.label;
        if (hudAltRef.current) hudAltRef.current.textContent = `ALT ${stage.alt}`;
        if (railFillRef.current) railFillRef.current.style.transform = `scaleX(${seqLocal})`;
      }

      // ---------- PHASE B: HOLD ----------
      else if (p <= HOLD_END) {
        const hold = (p - SEQ_END) / (HOLD_END - SEQ_END);
        layers.forEach((el, i) => {
          if (i === LAST) {
            el.style.opacity = '1';
            el.style.transform = `scale(${(1.04 + hold * 0.04).toFixed(4)})`;
          } else {
            el.style.opacity = '0';
          }
        });
        if (stickyRef.current) stickyRef.current.style.opacity = '1';
        if (mapEl) {
          mapEl.style.opacity = '0';
          mapEl.style.transform = 'scale(1.1)';
        }
        setRevealedOnce(false);
        if (hudLabelRef.current) hudLabelRef.current.textContent = 'ORBIT LOCKED';
        if (hudAltRef.current) hudAltRef.current.textContent = 'TARGET BELOW';
        if (railFillRef.current) railFillRef.current.style.transform = 'scaleX(1)';
      }

      // ---------- PHASE C: REVEAL ----------
      else {
        const rev = (p - HOLD_END) / (1 - HOLD_END);
        const dive = smootherstep(rev);
        const sat = layers[LAST];
        layers.forEach((el, i) => {
          if (i !== LAST) el.style.opacity = '0';
        });
        sat.style.opacity = (1 - smootherstep(clamp01(rev * 1.2))).toFixed(3);
        sat.style.transform = `scale(${lerp(1.08, 1.85, dive).toFixed(4)})`;

        if (stickyRef.current) {
          stickyRef.current.style.opacity = (1 - smootherstep(clamp01((rev - 0.1) / 0.9))).toFixed(3);
        }
        if (mapEl) {
          mapEl.style.opacity = clamp01(rev * 1.5).toFixed(3);
          mapEl.style.transform = `scale(${lerp(1.1, 1, dive).toFixed(4)})`;
        }
        setRevealedOnce(rev > 0.45);

        if (hudLabelRef.current) hudLabelRef.current.textContent = 'DESCENDING';
        if (hudAltRef.current) hudAltRef.current.textContent = 'ACQUIRING IMAGERY';
      }

      // Hero title flies past during first ~12%.
      if (heroTextRef.current) {
        const tp = smootherstep(clamp01(p / 0.12));
        heroTextRef.current.style.opacity = (1 - tp).toFixed(3);
        heroTextRef.current.style.transform = `scale(${(1 + tp * 0.45).toFixed(3)})`;
      }
      if (chevronRef.current) {
        chevronRef.current.style.opacity = clamp01(1 - p / 0.04).toFixed(3);
      }
    };

    layers.forEach((el, i) =>
      gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: i === 0 ? 1 : 1.18 })
    );
    render(0);

    const st = ScrollTrigger.create({
      trigger: pinRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        render(self.progress);
        setProgress(self.progress);
      },
    });

    return () => {
      st.kill();
      if (mapEl) {
        mapEl.style.opacity = '';
        mapEl.style.transform = '';
      }
    };
  }, [ready, setRevealed]);

  // Once fully dived, drop the hero out of the paint path entirely.
  const heroDone = progress > 0.995;

  return (
    <section
      ref={pinRef}
      className={`zoom-pin ${heroDone ? 'zoom-pin--done' : ''}`}
      aria-label="Bhoomi Sense intro"
    >
      <div ref={stickyRef} className="zoom-sticky">
        {STAGES.map((stage, i) => (
          <div
            key={stage.id}
            ref={(el) => (layerRefs.current[i] = el)}
            className={`zoom-layer zoom-layer-${i}`}
            style={{ backgroundImage: `url(${stage.src})` }}
          />
        ))}

        <div className="zoom-grade-overlay" />
        <div className="zoom-vignette" />

        <div className="zoom-hud liquid" aria-hidden="true">
          <span className="zoom-hud__dot" />
          <span ref={hudLabelRef} className="zoom-hud__label mono">SOIL</span>
          <span className="zoom-hud__sep" />
          <span ref={hudAltRef} className="zoom-hud__alt mono">ALT 0.3 m</span>
          <span className="zoom-hud__rail">
            <span ref={railFillRef} className="zoom-hud__rail-fill" />
          </span>
        </div>

        <div ref={heroTextRef} className="zoom-hero-text">
          <p className="zoom-eyebrow mono">FROM THE GROUND UP</p>
          <h1 className="zoom-title">
            BHOOMI<br />SENSE
          </h1>
          <p className="zoom-tagline">Soil to satellite intelligence for every field.</p>
        </div>

        <div ref={chevronRef} className="zoom-chevron" aria-hidden="true">
          <span className="zoom-chevron-label mono">SCROLL TO DESCEND</span>
          <svg width="40" height="26" viewBox="0 0 40 26" fill="none">
            <path d="M5 6 L20 20 L35 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {!ready && (
          <div className="zoom-loading">
            <div className="brutal-spinner" />
            <span className="mono">LOADING ORBIT…</span>
          </div>
        )}
      </div>
    </section>
  );
}
