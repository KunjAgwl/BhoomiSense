import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { LANGUAGES } from '../data/constants';
import './IntelligenceDashboard.css';

// ── Helpers ──────────────────────────────────────────────────────────────
const ACTION_ICONS = {
  'water':'💧','no-water':'🚫','fertilizer':'🧪','harvest':'🌾',
  'spray':'💊','inspect':'��','seed':'🌱','default':'📌',
};
const SPEECH_LANG = { en:'en-IN', hi:'hi-IN', mr:'mr-IN', pa:'pa-IN', ta:'ta-IN' };

function getNdviStatus(v) {
  if (v < 0.2)  return 'critical';
  if (v < 0.4)  return 'severe';
  if (v < 0.55) return 'stressed';
  if (v < 0.7)  return 'moderate';
  if (v < 0.85) return 'healthy';
  return 'excellent';
}

function buildSpeechText(data, lang) {
  if (!data) return '';
  const t = data.translations?.[lang];
  if (t?.action_plan_audio_text) return t.action_plan_audio_text;
  if (t?.summary) return t.summary;
  if (Array.isArray(t?.actions)) return t.actions.join('. ');
  const plan = Array.isArray(data.action_plan) ? data.action_plan : [];
  const env = data.environment || {};
  return [
    `Advisory for ${data.crop} in ${data.state}.`,
    ...plan.map(p => `${p.day}: ${p.action}`),
    env.root_zone_moisture_pct ? `Soil moisture is ${env.root_zone_moisture_pct} percent.` : '',
    env.current_temp_c ? `Temperature is ${env.current_temp_c} degrees Celsius.` : '',
  ].filter(Boolean).join(' ');
}

function pickVoice(voices, langTag) {
  if (!voices.length) return null;
  return voices.find(v => v.lang === langTag)
    || voices.find(v => v.lang.startsWith(langTag.split('-')[0]))
    || voices.find(v => v.lang.startsWith('en'))
    || voices[0];
}

// ── Sub-components ────────────────────────────────────────────────────────

function DataChip({ value, label, sublabel, color, icon }) {
  return (
    <div className={`data-chip chip-${color}`}>
      <div className="chip-top">
        <span className="chip-icon">{icon}</span>
        <span className="chip-label label">{label}</span>
      </div>
      <div className="chip-value">{value}</div>
      <div className="chip-sublabel">{sublabel}</div>
    </div>
  );
}

function NdviStatusBar({ ndviMean }) {
  const status = getNdviStatus(ndviMean);
  const pct = Math.min(98, ndviMean * 100);
  return (
    <div className="ndvi-status-bar">
      <div className="nsb-header">
        <div className="nsb-left">
          <span className={`nsb-status-badge status-${status}`}>{status.toUpperCase()}</span>
          <span className="nsb-metric label">NDVI INDEX</span>
        </div>
        <span className="nsb-value">{ndviMean.toFixed(2)}</span>
      </div>
      <div className="nsb-track">
        <div className="nsb-zones">
          <div className="nsb-zone zone-critical"  style={{width:'20%'}} />
          <div className="nsb-zone zone-severe"    style={{width:'20%'}} />
          <div className="nsb-zone zone-stressed"  style={{width:'15%'}} />
          <div className="nsb-zone zone-moderate"  style={{width:'15%'}} />
          <div className="nsb-zone zone-healthy"   style={{width:'15%'}} />
          <div className="nsb-zone zone-excellent" style={{width:'15%'}} />
        </div>
        <div className="nsb-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="nsb-scale">
        <span>0.0</span><span>0.2</span><span>0.4</span>
        <span>0.55</span><span>0.7</span><span>0.85</span><span>1.0</span>
      </div>
    </div>
  );
}

function MandiMiniCard({ mandi }) {
  if (!mandi?.current) return null;
  const history = mandi.history_7day?.length
    ? mandi.history_7day
    : Array.from({length:7}, (_,i) => mandi.current * (0.92 + i * 0.015));
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const trend = mandi.trend || (history[6] >= history[0] ? 'rising' : 'falling');

  return (
    <div className="mandi-mini-card">
      <div className="mandi-mini-header">
        <span className="label">MANDI PRICE</span>
        <span className={`trend-badge ${trend}`}>
          {trend === 'rising' ? '▲' : '▼'} {mandi.trendPercent || ''}
        </span>
      </div>
      <div className="mandi-mini-row">
        <div className="mandi-price-big">&#8377;{mandi.current}</div>
        <svg width="80" height="32" viewBox="0 0 80 32">
          {history.map((price, i) => {
            const h = ((price - min) / range) * 24 + 4;
            return (
              <rect key={i} x={i*12} y={32-h} width={8} height={h} rx="2"
                fill={i === history.length-1 ? 'var(--color-signal)' : 'rgba(74,222,128,0.2)'}
              />
            );
          })}
        </svg>
      </div>
      <div className="mandi-market">{mandi.market}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function IntelligenceDashboard() {
  const advisoryData       = useStore(s => s.advisoryData);
  const dashboardOpen      = useStore(s => s.dashboardOpen);
  const selectedLanguage   = useStore(s => s.selectedLanguage);
  const setSelectedLanguage = useStore(s => s.setSelectedLanguage);
  const closeDashboard     = useStore(s => s.closeDashboard);
  const navigate           = useNavigate();

  const [activeDay, setActiveDay] = useState(0);
  const [speaking, setSpeaking]   = useState(false);
  const [voices, setVoices]       = useState([]);
  const utterRef = useRef(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    if (!dashboardOpen) { window.speechSynthesis?.cancel(); setSpeaking(false); }
  }, [dashboardOpen]);

  useEffect(() => {
    if (dashboardOpen && advisoryData) setActiveDay(0);
  }, [dashboardOpen, advisoryData]);

  const handleClose = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    closeDashboard();
  }, [closeDashboard]);

  const handleTTS = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking || synth.speaking) { synth.cancel(); setSpeaking(false); return; }
    const text = buildSpeechText(advisoryData, selectedLanguage);
    if (!text) return;
    const langTag = SPEECH_LANG[selectedLanguage] || 'en-IN';
    const voice = pickVoice(voices.length ? voices : synth.getVoices(), langTag);
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = langTag; u.rate = 0.9; u.pitch = 1; u.volume = 1;
      if (voice) u.voice = voice;
      u.onstart = () => setSpeaking(true);
      u.onend   = () => setSpeaking(false);
      u.onerror = (e) => { if (e.error !== 'interrupted') console.warn('TTS:', e.error); setSpeaking(false); };
      utterRef.current = u;
      synth.speak(u);
    }, 50);
  }, [advisoryData, selectedLanguage, voices, speaking]);

  if (!dashboardOpen || !advisoryData) return null;

  const env    = advisoryData.environment || {};
  const savings = advisoryData.resource_savings || {};
  const plan   = Array.isArray(advisoryData.action_plan) ? advisoryData.action_plan : [];
  const alerts = advisoryData.critical_alerts || [];
  const mandi  = advisoryData.mandi_price;
  const ndviGrid = advisoryData.ndvi_grid;
  const ndviMean = ndviGrid?.values?.length
    ? parseFloat((ndviGrid.values.reduce((a,b)=>a+b,0)/ndviGrid.values.length).toFixed(2))
    : 0.62;

  const moisture = env.root_zone_moisture_pct || 0;
  const rain     = env.rain_forecast_7day_mm  || 0;
  const temp     = env.current_temp_c         || 0;
  const lat      = advisoryData.location?.lat;
  const lon      = advisoryData.location?.lon;

  const activeAction = plan[activeDay];

  const getDaySeverity = (i) => {
    const p = plan[i];
    if (!p) return 'safe';
    const icon = p.icon || '';
    if (/spray|danger|critical|pest/.test(icon)) return 'danger';
    if (/fertilize|warn|harvest/.test(icon)) return 'warn';
    return 'safe';
  };

  const getDayIcon = (i) => {
    const p = plan[i];
    return p ? (ACTION_ICONS[p.icon] || ACTION_ICONS.default) : '📌';
  };

  return (
    <div className="adv-panel-wrap">

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="panel-header">
        <div className="panel-header-left">
          <div className="crop-state-row">
            <span className="crop-badge">
              <span className="crop-dot" />
              {advisoryData.crop?.toUpperCase()}
            </span>
            <span className="state-name">{advisoryData.state}</span>
          </div>
          {lat && lon && (
            <div className="panel-coords label">
              {lat.toFixed(4)}&#176;N · {lon.toFixed(4)}&#176;E
            </div>
          )}
        </div>
        <div className="panel-header-right">
          <select className="lang-select-mini" value={selectedLanguage}
            onChange={e => { setSelectedLanguage(e.target.value); if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); } }}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>)}
          </select>
          <button className={`tts-btn-mini${speaking ? ' active' : ''}`} onClick={handleTTS}
            title={speaking ? 'Stop' : 'Read aloud'}>
            {speaking ? '■' : '▶'}
          </button>
          <button className="tts-btn-mini" onClick={() => navigate('/analytics')} title="Analytics">&#9650;</button>
          <button className="close-panel-btn" onClick={handleClose} title="Close">&#215;</button>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ─────────────────────────── */}
      <div className="panel-scroll-body">

        {/* Alert banner */}
        {alerts.length > 0 && (
          <div className={`alert-banner severity-${alerts[0].severity || 'danger'}`}>
            <div className="alert-banner-inner">
              <div className="alert-icon-col">
                <div className="alert-icon">&#9888;</div>
                <div className="alert-pulse-ring" />
              </div>
              <div className="alert-text-col">
                <strong className="alert-title">{alerts[0].title || 'Critical Alert'}</strong>
                <p className="alert-body">{alerts[0].message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data chips 2×2 */}
        <div className="data-chips-grid">
          <DataChip
            value={ndviMean.toFixed(2)} label="NDVI" sublabel="Crop Health" icon="&#128752;"
            color={ndviMean < 0.4 ? 'danger' : ndviMean < 0.6 ? 'warn' : 'signal'}
          />
          <DataChip
            value={`${moisture.toFixed(0)}%`} label="MOISTURE" sublabel="Root Zone" icon="&#128167;"
            color={moisture < 20 ? 'danger' : moisture < 30 ? 'warn' : 'sky'}
          />
          <DataChip
            value={`${temp.toFixed(0)}&#176;C`} label="TEMP" sublabel="Air Temp" icon="&#127777;"
            color={temp > 38 ? 'danger' : temp < 8 ? 'sky' : 'signal'}
          />
          <DataChip
            value={`${rain.toFixed(0)}mm`} label="RAIN" sublabel="7-Day Forecast" icon="&#127783;"
            color="sky"
          />
        </div>

        {/* NDVI status bar */}
        <NdviStatusBar ndviMean={ndviMean} />

        <div className="panel-divider" />

        {/* 3-Day action plan */}
        <div className="action-timeline-section">
          <span className="label section-label">3-DAY ACTION PLAN</span>
          <div className="day-tabs">
            {['Today', 'Tomorrow', 'Day 3'].map((day, i) => (
              <button key={i}
                className={`day-tab${activeDay === i ? ' active' : ''}`}
                onClick={() => setActiveDay(i)}>
                <span className="day-tab-label">{day}</span>
                <span className={`day-tab-dot severity-${getDaySeverity(i)}`} />
              </button>
            ))}
          </div>
          {activeAction && (
            <div className="advisory-card">
              <div className="advisory-icon-row">
                <span className="advisory-day-icon">{getDayIcon(activeDay)}</span>
                <span className={`urgency-pill urgency-${getDaySeverity(activeDay)}`}>
                  {getDaySeverity(activeDay) === 'danger' ? '&#128308; CRITICAL ACTION'
                    : getDaySeverity(activeDay) === 'warn' ? '&#128993; IMPORTANT'
                    : '&#128994; ROUTINE'}
                </span>
              </div>
              <p className="advisory-main-text">{activeAction.action}</p>
              {activeAction.detail && (
                <p className="advisory-secondary-text">{activeAction.detail}</p>
              )}
            </div>
          )}
        </div>

        <div className="panel-divider" />

        {/* Mandi price */}
        {mandi?.current && <MandiMiniCard mandi={mandi} />}

        {/* Savings */}
        {(savings.water_liters > 0 || savings.electricity_inr > 0 || savings.fertilizer_inr_saved > 0) && (
          <div className="savings-section">
            <span className="label section-label">TODAY'S SAVINGS</span>
            <div className="savings-cards-row">
              {savings.water_liters > 0 && (
                <div className="savings-card">
                  <div className="savings-num text-sky">{savings.water_liters.toLocaleString('en-IN')}L</div>
                  <div className="savings-label">Water saved</div>
                  <div className="savings-context">By skipping irrigation</div>
                </div>
              )}
              {savings.electricity_inr > 0 && (
                <div className="savings-card">
                  <div className="savings-num text-gold">&#8377;{savings.electricity_inr}</div>
                  <div className="savings-label">Pump cost saved</div>
                  <div className="savings-context">Electricity not used</div>
                </div>
              )}
              {savings.fertilizer_inr_saved > 0 && (
                <div className="savings-card">
                  <div className="savings-num text-signal">&#8377;{savings.fertilizer_inr_saved}</div>
                  <div className="savings-label">Fertilizer saved</div>
                  <div className="savings-context">Precision application</div>
                </div>
              )}
            </div>
            {savings.note && <p className="savings-note">{savings.note}</p>}
          </div>
        )}

      </div>
    </div>
  );
}
