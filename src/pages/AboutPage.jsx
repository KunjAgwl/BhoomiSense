import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import './AboutPage.css';

// ── Reusable reveal hook ──────────────────────────────────────────────────────
function useRevealOnScroll(ref, threshold = 0.15) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('revealed'); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
}

// ── Count-up animation ────────────────────────────────────────────────────────
function useCountUp(ref, target, duration = 1000) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.unobserve(el);
      let count = 0;
      const steps = 60;
      const step = Math.ceil(target / steps);
      const iv = setInterval(() => {
        count = Math.min(count + step, target);
        el.textContent = count.toLocaleString();
        if (count >= target) clearInterval(iv);
      }, duration / steps);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, target, duration]);
}

// ── Reveal wrapper component ───────────────────────────────────────────────────
function Reveal({ children, className = '', threshold = 0.15, tag: Tag = 'div', ...props }) {
  const ref = useRef(null);
  useRevealOnScroll(ref, threshold);
  return <Tag ref={ref} className={`reveal ${className}`} {...props}>{children}</Tag>;
}

// ── Pipeline node ─────────────────────────────────────────────────────────────
function PipelineNode({ color, label, sub, icon, large }) {
  return (
    <div className={`pipeline-node${large ? ' pipeline-node--large' : ''}`} style={{ '--node-color': color }}>
      <div className="pipeline-node-icon">
        {icon}
      </div>
      <span className="pipeline-node-label">{label}</span>
      <span className="pipeline-node-sub">{sub}</span>
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const SatIcon = () => (
  <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
    <rect x="9" y="6" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1" y="8" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="17" y="8" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="15" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);
const EarthIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
    <ellipse cx="11" cy="11" rx="4" ry="9" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);
const HexIcon = () => (
  <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
    <path d="M11 2L20.5 7.5V16.5L11 22L1.5 16.5V7.5L11 2Z" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="11" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);
const BrainIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 3C8 3 5 5.5 5 9c0 2 1 3.5 2.5 4.5v4.5h7V13.5C16 12.5 17 11 17 9c0-3.5-3-6-6-6z" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="11" y1="9" x2="11" y2="13" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="8" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);
const PersonIcon = () => (
  <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
    <circle cx="9" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1 22c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export default function AboutPage() {
  const setActivePanel = useStore((s) => s.setActivePanel);
  // Opening headline lines reveal
  const openingRef = useRef(null);
  const statsRef   = useRef(null);
  const countRef   = useRef(null);
  const ch1Ref     = useRef(null);
  const ch2Ref     = useRef(null);
  const ch3Ref     = useRef(null);
  const pipeRef    = useRef(null);
  const techRef    = useRef(null);
  const ctaRef     = useRef(null);

  useRevealOnScroll(openingRef, 0.1);
  useRevealOnScroll(statsRef,   0.2);
  useRevealOnScroll(ch1Ref,     0.15);
  useRevealOnScroll(ch2Ref,     0.15);
  useRevealOnScroll(ch3Ref,     0.15);
  useRevealOnScroll(pipeRef,    0.1);
  useRevealOnScroll(techRef,    0.1);
  useRevealOnScroll(ctaRef,     0.1);
  useCountUp(countRef, 4000);

  return (
    <div className="about-page">

      {/* ══ SECTION 1 — OPENING ════════════════════════════ */}
      <section className="about-opening" style={{ position: 'relative' }}>
        <div ref={openingRef} className="opening-inner reveal">
          <span className="about-overline label">BHOOMI SENSE · BUILT FOR INDIA</span>

          <h1 className="about-headline">
            <span className="headline-line" style={{ '--i': 0 }}>ISRO built the data.</span>
            <span className="headline-line" style={{ '--i': 1 }}>We built the door.</span>
          </h1>
        </div>

        <div ref={statsRef} className="opening-stats reveal">
          <div className="opening-stat">
            <span className="stat-num" ref={countRef}>0</span>
            <span className="stat-suffix">+</span>
            <span className="stat-label">ISRO satellite datasets<br />published and available</span>
          </div>
          <div className="opening-divider">vs</div>
          <div className="opening-stat">
            <span className="stat-num zero">0</span>
            <span className="stat-label">Farmers who can access<br />them without expert help</span>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <div className="scroll-cue-line" />
          <span className="label" style={{ fontSize: '0.6rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)' }}>SCROLL</span>
        </div>
      </section>

      {/* ══ SECTION 2 — STORY CHAPTERS ══════════════════════ */}
      <div className="story-section">

        {/* Chapter 1 */}
        <div ref={ch1Ref} className="chapter reveal">
          <div className="chapter-content">
            <span className="chapter-num label">01</span>
            <h2 className="chapter-title">The farmer can't see what the satellite sees.</h2>
            <p className="chapter-body">Every 5 days, Sentinel-2 captures 10-metre resolution imagery of every farm in India. It detects nutrient deficiency before leaves turn yellow. It spots the early signature of pest spread. It measures soil stress at the root zone. None of this reaches the farmer — it sits behind portals designed for researchers, not growers.</p>
          </div>
          <div className="chapter-aside">
            <div className="chapter-stat">
              <span className="chapter-stat-num">10m</span>
              <span className="chapter-stat-desc">Resolution of Sentinel-2<br />imagery over your field</span>
            </div>
          </div>
        </div>

        {/* Chapter 2 */}
        <div ref={ch2Ref} className="chapter chapter-alt reveal">
          <div className="chapter-aside">
            <div className="chapter-stat">
              <span className="chapter-stat-num">8s</span>
              <span className="chapter-stat-desc">Time from pin drop to<br />complete advisory</span>
            </div>
          </div>
          <div className="chapter-content">
            <span className="chapter-num label">02</span>
            <h2 className="chapter-title">We translated the data into one plain answer.</h2>
            <p className="chapter-body">BhoomiSense ingests NDVI crop health indices, NASA POWER soil moisture, 7-day weather forecasts, and live Mandi prices — then distils all of it into three sentences a farmer can act on today. In Hindi, Marathi, Punjabi, or Tamil. With a button that reads it aloud.</p>
          </div>
        </div>

        {/* Chapter 3 */}
        <div ref={ch3Ref} className="chapter reveal">
          <div className="chapter-content">
            <span className="chapter-num label">03</span>
            <h2 className="chapter-title">The advisory that used to cost ₹5,000 per visit now costs ₹0.</h2>
            <p className="chapter-body">Agricultural extension officers charge per farm visit. Most smallholders can't afford regular consultations. BhoomiSense makes satellite-quality agronomic advice free, instant, and accessible on any smartphone — no app install required.</p>
          </div>
          <div className="chapter-aside">
            <div className="chapter-stat">
              <span className="chapter-stat-num">₹0</span>
              <span className="chapter-stat-desc">Cost to the farmer for<br />satellite-quality advisory</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 3 — PIPELINE ═══════════════════════════ */}
      <section className="pipeline-section">
        <Reveal className="pipeline-header">
          <span className="about-overline label">THE TECH</span>
          <h2 className="section-headline">From orbit to advisory in 8 seconds.</h2>
          <p className="section-sub">Here's what happens when you drop a pin.</p>
        </Reveal>

        <div ref={pipeRef} className="pipeline-wrap reveal">
          <PipelineNode color="#38BDF8" label="Sentinel-2"  sub="NDVI crop health · 10m res"   icon={<SatIcon />} />
          <div className="pipeline-connector" />
          <PipelineNode color="#38BDF8" label="NASA POWER"  sub="Soil · Rain · Temp"           icon={<EarthIcon />} />
          <div className="pipeline-connector" />
          <PipelineNode color="#4ADE80" label="BhoomiSense" sub="Spatial fusion · Analysis"    icon={<HexIcon />} large />
          <div className="pipeline-connector" />
          <PipelineNode color="#A78BFA" label="Mistral AI"  sub="Advisory generation"          icon={<BrainIcon />} />
          <div className="pipeline-connector" />
          <PipelineNode color="#C9A84C" label="You"         sub="Plain language · Voice"       icon={<PersonIcon />} />
        </div>
      </section>

      {/* ══ SECTION 4 — TECH STACK ═════════════════════════ */}
      <section className="tech-section">
        <Reveal className="pipeline-header">
          <h2 className="section-headline">Built with what works.</h2>
        </Reveal>
        <div ref={techRef} className="tech-table reveal">
          {[
            { layer: 'FRONTEND',  stack: 'React · Vite · Leaflet · GSAP · Recharts' },
            { layer: 'BACKEND',   stack: 'Node.js · Express · Nominatim OSM' },
            { layer: 'DATA & AI', stack: 'Sentinel-2 · NASA POWER · Mistral AI · Web Speech API' },
          ].map(({ layer, stack }, i) => (
            <div key={i} className="tech-row">
              <span className="tech-layer mono">{layer}</span>
              <span className="tech-stack">{stack}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SECTION 5 — CTA ════════════════════════════════ */}
      <section className="about-cta-section">
        <div ref={ctaRef} className="about-cta-inner reveal">
          <span className="label" style={{ color: 'var(--color-signal)' }}>READY TO TRY IT</span>
          <h2 className="cta-headline">Drop a pin anywhere in India.</h2>
          <p className="cta-body">It takes 8 seconds. You'll get NDVI crop health, soil moisture, a 3-day action plan, and Mandi prices — in your language.</p>
          <button onClick={() => setActivePanel('dashboard')} className="cta-btn" style={{border: 'none', cursor: 'pointer'}}>Open Dashboard →</button>
        </div>
      </section>

    </div>
  );
}
