import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import './ScrollHeroSection.css';

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  { id: 'bhoomi1', src: '/images/bhoomi1.png', label: 'SOIL',      alt: '0.3 m' },
  { id: 'bhoomi2', src: '/images/bhoomi2.png', label: 'FIELD',     alt: '90 m' },
  { id: 'bhoomi3', src: '/images/bhoomi3.png', label: 'FARMLAND',  alt: '6 km' },
  { id: 'bhoomi4', src: '/images/bhoomi4.png', label: 'ORBIT',     alt: '320 km' },
  { id: 'bhoomi5', src: '/images/bhoomi5.png', label: 'SATELLITE', alt: '35,786 km' },
];

const SEQ_END  = 0.58;
const HOLD_END = 0.72;

// [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd] — all in scroll progress 0..1
const SCENE_WINDOWS = [
  [0.09, 0.14, 0.18, 0.22], // Scene 1
  [0.23, 0.28, 0.32, 0.36], // Scene 2
  [0.37, 0.42, 0.46, 0.50], // Scene 3
  [0.51, 0.55, 0.58, 0.62], // Scene 4
  [0.63, 0.68, 0.79, 0.86], // Scene 5 (during reveal)
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smootherstep = (x) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a, b, t) => a + (b - a) * t;

function sceneOpacity(p, [i0, i1, o0, o1]) {
  if (p < i0 || p > o1) return 0;
  if (p >= i1 && p <= o0) return 1;
  if (p < i1) return smootherstep((p - i0) / (i1 - i0));
  return 1 - smootherstep((p - o0) / (o1 - o0));
}

export default function ScrollHeroSection() {
  const pinRef      = useRef(null);
  const stickyRef   = useRef(null);
  const layerRefs   = useRef([]);
  const heroTextRef = useRef(null);
  const chevronRef  = useRef(null);
  const hudLabelRef = useRef(null);
  const hudAltRef   = useRef(null);
  const railFillRef = useRef(null);
  const textRefs    = useRef([]);
  const [ready, setReady]       = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const navigatedRef = useRef(false); // prevent double-fire

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const layers = layerRefs.current.filter(Boolean);
    if (layers.length !== STAGES.length) return;
    const mapEl = document.querySelector('.map-layer');
    const LAST  = STAGES.length - 1;

    // Ensure map starts hidden for the cinematic
    if (mapEl) {
      mapEl.style.opacity = '0';
      mapEl.style.transform = 'scale(1.1)';
    }

    const render = (p) => {
      if (p <= SEQ_END) {
        const seqLocal = p / SEQ_END;
        const raw = seqLocal * LAST;
        const seg = Math.min(Math.floor(raw), LAST - 1);
        const t   = smootherstep(raw - seg);
        const breathe = 1 + seqLocal * 0.05;
        layers.forEach((el, i) => {
          let opacity = 0, scale = 1.18;
          if (i === seg)          { opacity = 1 - t; scale = lerp(1, 1.14, t); }
          else if (i === seg + 1) { opacity = t;     scale = lerp(1.18, 1, t); }
          else if (i < seg)       { scale = 1.14; }
          el.style.opacity   = opacity.toFixed(3);
          el.style.transform = `scale(${(scale * breathe).toFixed(4)})`;
        });
        if (stickyRef.current) stickyRef.current.style.opacity = '1';
        if (mapEl) { mapEl.style.opacity = '0'; mapEl.style.transform = 'scale(1.1)'; }
        const stage = STAGES[Math.round(seqLocal * LAST)];
        if (hudLabelRef.current) hudLabelRef.current.textContent = stage.label;
        if (hudAltRef.current)   hudAltRef.current.textContent   = `ALT ${stage.alt}`;
        if (railFillRef.current) railFillRef.current.style.transform = `scaleX(${seqLocal})`;
      } else if (p <= HOLD_END) {
        const hold = (p - SEQ_END) / (HOLD_END - SEQ_END);
        layers.forEach((el, i) => {
          if (i === LAST) { el.style.opacity = '1'; el.style.transform = `scale(${(1.04 + hold * 0.04).toFixed(4)})`; }
          else             { el.style.opacity = '0'; }
        });
        if (stickyRef.current) stickyRef.current.style.opacity = '1';
        if (mapEl) { mapEl.style.opacity = '0'; mapEl.style.transform = 'scale(1.1)'; }
        if (hudLabelRef.current) hudLabelRef.current.textContent = 'ORBIT LOCKED';
        if (hudAltRef.current)   hudAltRef.current.textContent   = 'TARGET BELOW';
        if (railFillRef.current) railFillRef.current.style.transform = 'scaleX(1)';
      } else {
        const rev  = (p - HOLD_END) / (1 - HOLD_END);
        const dive = smootherstep(rev);
        layers.forEach((el, i) => { if (i !== LAST) el.style.opacity = '0'; });
        layers[LAST].style.opacity   = (1 - smootherstep(clamp01(rev * 1.2))).toFixed(3);
        layers[LAST].style.transform = `scale(${lerp(1.08, 1.85, dive).toFixed(4)})`;
        if (stickyRef.current) {
          stickyRef.current.style.opacity = (1 - smootherstep(clamp01((rev - 0.1) / 0.9))).toFixed(3);
        }
        if (mapEl) {
          mapEl.style.opacity   = clamp01(rev * 1.5).toFixed(3);
          mapEl.style.transform = `scale(${lerp(1.1, 1, dive).toFixed(4)})`;
        }
        if (hudLabelRef.current) hudLabelRef.current.textContent = 'DESCENDING';
        if (hudAltRef.current)   hudAltRef.current.textContent   = 'ACQUIRING IMAGERY';
      }

      // Hero title: only during first 8%
      if (heroTextRef.current) {
        const tp = smootherstep(clamp01(p / 0.08));
        heroTextRef.current.style.opacity   = (1 - tp).toFixed(3);
        heroTextRef.current.style.transform = `scale(${(1 + tp * 0.45).toFixed(3)})`;
      }
      if (chevronRef.current) {
        chevronRef.current.style.opacity = clamp01(1 - p / 0.04).toFixed(3);
      }

      // Scene texts: one at a time
      textRefs.current.forEach((el, i) => {
        if (!el) return;
        const op = sceneOpacity(p, SCENE_WINDOWS[i]);
        el.style.opacity = op.toFixed(3);
        const [i0, i1, o0, o1] = SCENE_WINDOWS[i];
        let y = 0;
        if (p < i1 && p > i0) {
          y = lerp(24, 0, smootherstep((p - i0) / (i1 - i0)));
        } else if (p > o0 && p < o1) {
          y = lerp(0, -24, smootherstep((p - o0) / (o1 - o0)));
        }
        el.style.transform = `translateY(${y.toFixed(1)}px)`;
      });
    };

    layers.forEach((el, i) =>
      gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: i === 0 ? 1 : 1.18 })
    );
    render(0);

    const st = ScrollTrigger.create({
      trigger: pinRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      pin: true,
      pinSpacing: true,
      scroller: window,
      onUpdate: (self) => {
        render(self.progress);
        setProgress(self.progress);
        // Auto-navigate once scroll fully completes
        if (self.progress >= 0.99 && !navigatedRef.current) {
          navigatedRef.current = true;
          setTimeout(() => navigate('/dashboard'), 600);
        }
      },
      onLeave: () => {
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          navigate('/dashboard');
        }
      },
    });

    ScrollTrigger.refresh();

    return () => {
      st.kill();
      navigatedRef.current = false;
      if (mapEl) { mapEl.style.opacity = ''; mapEl.style.transform = ''; }
    };
  }, [ready]);

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
          <span ref={hudAltRef}   className="zoom-hud__alt mono">ALT 0.3 m</span>
          <span className="zoom-hud__rail">
            <span ref={railFillRef} className="zoom-hud__rail-fill" />
          </span>
        </div>

        {/* Hero title: only visible at scroll start */}
        <div ref={heroTextRef} className="zoom-hero-text">
          <p className="zoom-eyebrow mono">FROM THE GROUND UP</p>
          <h1 className="zoom-title">BHOOMI<br />SENSE</h1>
          <p className="zoom-tagline">Soil to satellite intelligence for every field.</p>
        </div>

        {/* Scene 1 */}
        <div ref={el => textRefs.current[0] = el} className="scene-text scene-left" style={{ opacity: 0 }}>
          <span className="scene-label">120 MILLION FARMERS</span>
          <h1 className="scene-headline">Flying<br />Blind.</h1>
          <p className="scene-body">Satellite data exists. No farmer can reach it.</p>
        </div>

        {/* Scene 2 */}
        <div ref={el => textRefs.current[1] = el} className="scene-text scene-left" style={{ opacity: 0 }}>
          <span className="scene-label">ISRO · SENTINEL-2 · NASA</span>
          <h1 className="scene-headline">The Data<br />Is There.</h1>
          <p className="scene-body">10-meter crop health imagery. Updated every 5 days. Locked behind expert portals.</p>
        </div>

        {/* Scene 3 */}
        <div ref={el => textRefs.current[2] = el} className="scene-text scene-left" style={{ opacity: 0 }}>
          <span className="scene-label">SMALLHOLDER FARMERS · INDIA</span>
          <h1 className="scene-headline">They Just<br />Need One<br />Answer.</h1>
          <p className="scene-body">"Should I irrigate today? Is my crop healthy? When should I sell?"</p>
        </div>

        {/* Scene 4 */}
        <div ref={el => textRefs.current[3] = el} className="scene-text scene-left" style={{ opacity: 0 }}>
          <span className="scene-label">BHOOMI SENSE</span>
          <h1 className="scene-headline">We Built<br />The<br />Last Mile.</h1>
          <p className="scene-body">Three satellite data layers. One plain-language advisory. In their language.</p>
        </div>

        {/* Scene 5 */}
        <div ref={el => textRefs.current[4] = el} className="scene-text scene-center" style={{ opacity: 0 }}>
          <span className="scene-label">DROP A PIN · GET AN ADVISORY</span>
          <h1 className="scene-headline">Your Field.<br />Now.</h1>
          <div className="scene-cta-wrapper">
            <button className="scene-cta" onClick={() => navigate('/dashboard')}>
              Enter Bhoomi Sense →
            </button>
          </div>
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

        {heroDone && (
          <div className="zoom-enter-action">
            <button
              className="zoom-enter-btn"
              onClick={() => navigate('/dashboard')}
              aria-label="Enter Bhoomi Sense dashboard"
            >
              ENTER BHOOMI SENSE
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
