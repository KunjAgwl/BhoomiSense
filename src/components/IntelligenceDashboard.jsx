import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { LANGUAGES } from '../data/constants';
import './IntelligenceDashboard.css';

const ACTION_ICONS = {
  'water':'💧','no-water':'🚫','fertilizer':'🧪','harvest':'🌾',
  'spray':'💊','inspect':'🔍','seed':'🌱','default':'📌',
};

// BCP-47 lang tag for Web Speech API
const SPEECH_LANG = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', pa: 'pa-IN', ta: 'ta-IN',
};

// Build the text to speak from advisory data + selected language
function buildSpeechText(advisoryData, lang) {
  if (!advisoryData) return '';

  // If backend returned a translation block for this language, use it
  const t = advisoryData.translations?.[lang];
  if (t) {
    // Use action_plan_audio_text if present (written for TTS), else join actions
    if (t.action_plan_audio_text) return t.action_plan_audio_text;
    if (t.summary) return t.summary;
    if (Array.isArray(t.actions)) return t.actions.join('. ');
  }

  // Fallback — build English text from action plan
  const plan = Array.isArray(advisoryData.action_plan) ? advisoryData.action_plan : [];
  const env  = advisoryData.environment || {};
  const parts = [
    `Advisory for ${advisoryData.crop} in ${advisoryData.state}.`,
    ...plan.map(p => `${p.day}: ${p.action}`),
  ];
  if (env.root_zone_moisture_pct) parts.push(`Soil moisture is ${env.root_zone_moisture_pct} percent.`);
  if (env.current_temp_c) parts.push(`Temperature is ${env.current_temp_c} degrees Celsius.`);
  return parts.join(' ');
}

// Pick the best available voice for a given BCP-47 lang tag
function pickVoice(voices, langTag) {
  if (!voices.length) return null;
  // Exact match first
  const exact = voices.find(v => v.lang === langTag);
  if (exact) return exact;
  // Prefix match (e.g. 'hi' matches 'hi-IN')
  const prefix = langTag.split('-')[0];
  const partial = voices.find(v => v.lang.startsWith(prefix));
  if (partial) return partial;
  // Fallback to en-IN or en-US
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

// Animated SVG arc gauge
function ArcGauge({ value, max, color, label, unit, size = 90 }) {
  const arcRef = useRef(null);
  const pct = Math.min(1, Math.max(0, value / max));
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  // Only show 270° of the circle (from 135° to 405°)
  const arcLen = circ * 0.75;
  const offset = arcLen * (1 - pct);

  useEffect(() => {
    if (!arcRef.current) return;
    gsap.fromTo(arcRef.current,
      { strokeDashoffset: arcLen },
      { strokeDashoffset: offset, duration: 1.4, ease: 'power2.out', delay: 0.2 }
    );
  }, [arcLen, offset]);

  // Rotation so arc starts at bottom-left
  const rotate = 135;
  return (
    <div className="arc-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth="6"
          strokeDasharray={`${arcLen} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(${rotate} ${size/2} ${size/2})`}
        />
        {/* Fill */}
        <circle ref={arcRef} cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${arcLen} ${circ}`}
          strokeDashoffset={arcLen}
          strokeLinecap="round"
          transform={`rotate(${rotate} ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
        />
      </svg>
      <div className="arc-gauge-center">
        <span className="arc-val" style={{ color }}>{value}{unit}</span>
        <span className="arc-label mono">{label}</span>
      </div>
    </div>
  );
}

// Thin horizontal bar — not a box, just a line with a dot
function DataLine({ label, value, max, color, unit }) {
  const fillRef = useRef(null);
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  useEffect(() => {
    if (fillRef.current) {
      gsap.fromTo(fillRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out', delay: 0.1 });
    }
  }, [pct]);
  return (
    <div className="data-line">
      <span className="dl-label mono">{label}</span>
      <div className="dl-track">
        <div className="dl-fill" ref={fillRef}
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}40, ${color})`, transformOrigin: 'left' }}
        />
        <div className="dl-dot" style={{ left: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <span className="dl-val mono" style={{ color }}>{value}{unit}</span>
    </div>
  );
}

export default function IntelligenceDashboard() {
  const advisoryData     = useStore((s) => s.advisoryData);
  const dashboardOpen    = useStore((s) => s.dashboardOpen);
  const selectedLanguage = useStore((s) => s.selectedLanguage);
  const setSelectedLanguage = useStore((s) => s.setSelectedLanguage);
  const closeDashboard   = useStore((s) => s.closeDashboard);
  const navigate         = useNavigate();

  const panelRef    = useRef(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices]   = useState([]);
  const utterRef = useRef(null);

  // Load voices — some browsers load them async
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  // Stop speaking when panel closes
  useEffect(() => {
    if (!dashboardOpen) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    }
  }, [dashboardOpen]);

  useEffect(() => {
    if (dashboardOpen && advisoryData && panelRef.current) {
      gsap.fromTo(panelRef.current,
        { x: '-100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.65, ease: 'expo.out' }
      );
      setDayIdx(0);
    }
  }, [dashboardOpen, advisoryData]);

  const handleClose = () => {
    gsap.to(panelRef.current, {
      x: '-100%', opacity: 0, duration: 0.4, ease: 'expo.in',
      onComplete: closeDashboard,
    });
  };

  const handleTTS = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Stop if already speaking
    if (speaking || synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const text = buildSpeechText(advisoryData, selectedLanguage);
    if (!text) return;

    const u = new SpeechSynthesisUtterance(text);
    const langTag = SPEECH_LANG[selectedLanguage] || 'en-IN';
    u.lang = langTag;

    // Pick best voice — may be empty on first call, retry after voices load
    const allVoices = voices.length ? voices : synth.getVoices();
    const voice = pickVoice(allVoices, langTag);
    if (voice) u.voice = voice;

    u.rate  = 0.92;
    u.pitch = 1.0;
    u.volume = 1.0;

    u.onstart  = () => setSpeaking(true);
    u.onend    = () => setSpeaking(false);
    u.onerror  = (e) => { console.warn('TTS error', e); setSpeaking(false); };
    u.onpause  = () => setSpeaking(false);

    utterRef.current = u;

    // Chrome bug: long utterances get cut off — chunk and queue
    const CHUNK = 200;
    const words = text.split(' ');
    if (words.length <= CHUNK) {
      synth.speak(u);
    } else {
      // Split into chunks of ~200 words
      let i = 0;
      const speakChunk = () => {
        if (i >= words.length) { setSpeaking(false); return; }
        const chunk = words.slice(i, i + CHUNK).join(' ');
        const cu = new SpeechSynthesisUtterance(chunk);
        cu.lang  = langTag;
        if (voice) cu.voice = voice;
        cu.rate  = 0.92;
        cu.onend = speakChunk;
        cu.onerror = () => setSpeaking(false);
        if (i === 0) cu.onstart = () => setSpeaking(true);
        synth.speak(cu);
        i += CHUNK;
      };
      speakChunk();
    }
  }, [advisoryData, selectedLanguage, voices, speaking]);

  if (!dashboardOpen || !advisoryData) return null;

  const env     = advisoryData.environment || {};
  const savings = advisoryData.resource_savings || {};
  const plan    = Array.isArray(advisoryData.action_plan) ? advisoryData.action_plan : [];
  const alerts  = advisoryData.critical_alerts || [];
  const mandi   = advisoryData.mandi_price;
  const ndviGrid = advisoryData.ndvi_grid;
  const ndviMean = ndviGrid?.values?.length
    ? parseFloat((ndviGrid.values.reduce((a,b)=>a+b,0) / ndviGrid.values.length).toFixed(2))
    : 0.62;

  const moisture = env.root_zone_moisture_pct || 0;
  const rain     = env.rain_forecast_7day_mm  || 0;
  const temp     = env.current_temp_c         || 0;

  const ndviColor = ndviMean >= 0.7 ? '#4ADE80' : ndviMean >= 0.4 ? '#FFD700' : '#FF4500';
  const ndviStatus = ndviMean >= 0.7 ? 'HEALTHY' : ndviMean >= 0.4 ? 'MODERATE' : 'STRESSED';

  const activeAction = plan[dayIdx];

  return (
    <div className="adv-panel-wrap" ref={panelRef}>
      {/* Thin green top accent line */}
      <div className="adv-accent-line" />

      {/* ── TOP ROW ─────────────────────────────── */}
      <div className="adv-toprow">
        <div className="adv-identity">
          <span className="adv-pip" />
          <span className="adv-crop mono">{advisoryData.crop?.toUpperCase()}</span>
          <span className="adv-sep mono">·</span>
          <span className="adv-state mono">{advisoryData.state}</span>
        </div>
        <div className="adv-controls">
          <select className="adv-lang mono" value={selectedLanguage}
            onChange={e => { setSelectedLanguage(e.target.value); if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); } }}>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
            ))}
          </select>
          <button
            className={`adv-ctrl-btn${speaking ? ' active' : ''}`}
            onClick={handleTTS}
            title={speaking ? 'Stop reading' : `Read aloud in ${LANGUAGES.find(l=>l.code===selectedLanguage)?.label || 'English'}`}
          >
            {speaking ? '■' : '▶'}
          </button>
          <button className="adv-ctrl-btn" onClick={() => navigate('/analytics')} title="Analytics">⬡</button>
          <button className="adv-ctrl-btn adv-close-btn" onClick={handleClose}>✕</button>
        </div>
      </div>

      {/* ── ALERT (if any) ──────────────────────── */}
      {alerts[0] && (
        <div className="adv-alert-strip">
          <span className="adv-alert-dot" />
          <span className="adv-alert-text mono">{alerts[0].message || alerts[0].title}</span>
        </div>
      )}

      {/* ── GAUGES ROW ──────────────────────────── */}
      <div className="adv-gauges">
        <ArcGauge value={ndviMean} max={1} color={ndviColor} label="NDVI" unit="" size={120} />
        <ArcGauge value={moisture} max={100} color="#38BDF8" label="MOISTURE" unit="%" size={120} />
        <ArcGauge value={Math.min(temp, 50)} max={50} color="#FB923C" label="TEMP" unit="°C" size={120} />
        <ArcGauge value={Math.min(rain, 80)} max={80} color="#818CF8" label="RAIN" unit="mm" size={120} />
      </div>

      {/* ── NDVI STATUS LINE ─────────────────────── */}
      <div className="adv-ndvi-line">
        <span className="adv-ndvi-status" style={{ color: ndviColor }}>{ndviStatus}</span>
        <DataLine label="NDVI" value={ndviMean} max={1} color={ndviColor} unit="" />
      </div>

      {/* ── ACTION PLAN ─────────────────────────── */}
      <div className="adv-action-section">
        <div className="adv-day-tabs">
          {plan.map((p, i) => (
            <button key={i}
              className={`adv-day-tab${dayIdx === i ? ' active' : ''}`}
              onClick={() => setDayIdx(i)}>
              {p.day || `Day ${i+1}`}
            </button>
          ))}
        </div>
        {activeAction && (
          <div className="adv-action-card">
            <span className="adv-action-icon">
              {ACTION_ICONS[activeAction.icon] || ACTION_ICONS.default}
            </span>
            <div className="adv-action-text">
              <p className="adv-action-main">{activeAction.action}</p>
              {activeAction.detail && (
                <p className="adv-action-detail">{activeAction.detail}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── IMPACT STRIP ────────────────────────── */}
      <div className="adv-impact-strip">
        {savings.water_liters > 0 && (
          <div className="adv-impact-item">
            <span className="aii-val" style={{ color: '#38BDF8' }}>{savings.water_liters.toLocaleString()}L</span>
            <span className="aii-label mono">water saved</span>
          </div>
        )}
        {savings.electricity_inr > 0 && (
          <div className="adv-impact-item">
            <span className="aii-val" style={{ color: '#FACC15' }}>₹{savings.electricity_inr}</span>
            <span className="aii-label mono">elec savings</span>
          </div>
        )}
        {mandi?.current && (
          <div className="adv-impact-item">
            <span className="aii-val" style={{ color: '#4ADE80' }}>₹{mandi.current}</span>
            <span className="aii-label mono">{mandi.crop?.toLowerCase()} /qtl</span>
          </div>
        )}
      </div>

      {savings.note && (
        <p className="adv-savings-note mono">{savings.note}</p>
      )}
    </div>
  );
}
