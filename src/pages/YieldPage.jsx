import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import gsap from 'gsap';
import './YieldPage.css';

// ── Helpers ────────────────────────────────────────────────────
function getScoreClass(s)  { return s < 0.6 ? 'poor' : s < 1.0 ? 'below' : s < 1.4 ? 'good' : 'excellent'; }
function getScoreLabel(s)  { return s < 0.6 ? 'Poor' : s < 1.0 ? 'Below avg' : s < 1.4 ? 'Good' : 'Excellent'; }
function getScoreColor(s)  { return s < 0.6 ? '#F43F5E' : s < 1.0 ? '#F59E0B' : '#4ADE80'; }
function getUnit(key)      { return { ndvi:'', moisture:'%', rainfall:'mm', temperature:'°C' }[key] || ''; }

// ── Confidence semicircle ──────────────────────────────────────
function ConfidenceArc({ confidence }) {
  const arcRef = useRef(null);
  const numRef = useRef(null);
  const ARC_LEN = 251;

  useEffect(() => {
    if (!arcRef.current || !numRef.current) return;
    const target = (confidence / 100) * ARC_LEN;
    gsap.to(arcRef.current, {
      attr: { strokeDasharray: `${target} ${ARC_LEN}` },
      duration: 1.8, ease: 'power3.out', delay: 0.3,
    });
    gsap.to({ val: 0 }, {
      val: confidence, duration: 1.8, ease: 'power3.out', delay: 0.3,
      onUpdate() { if (numRef.current) numRef.current.textContent = Math.round(this.targets()[0].val) + '%'; },
    });
  }, [confidence]);

  return (
    <svg width="200" height="110" viewBox="0 0 200 110">
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
      <path ref={arcRef} d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
        stroke="#4ADE80" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`0 ${ARC_LEN}`}
        style={{ filter: 'drop-shadow(0 0 6px rgba(74,222,128,0.5))' }}
      />
      <text x="100" y="88" textAnchor="middle" fill="#E2EDE8"
        fontSize="22" fontWeight="700" fontFamily="var(--font-display)"
        ref={numRef}>0%</text>
      <text x="100" y="106" textAnchor="middle" fill="rgba(255,255,255,0.35)"
        fontSize="10" fontFamily="var(--font-mono)" letterSpacing="2">CONFIDENCE</text>
    </svg>
  );
}

// ── Factor row ─────────────────────────────────────────────────
function FactorRow({ factorKey, factor }) {
  const color = getScoreColor(factor.score);
  const thresholds = [0.4, 0.8, 1.2, 1.6, 2.0];
  return (
    <div className="factor-row">
      <div className="factor-header">
        <span className="factor-label">{factor.label}</span>
        <span className="factor-value mono">{factor.value}{getUnit(factorKey)}</span>
        <span className={`factor-score score-${getScoreClass(factor.score)}`}>
          {getScoreLabel(factor.score)}
        </span>
      </div>
      <div className="factor-bar">
        {thresholds.map((thresh, i) => (
          <div key={i} className="factor-segment"
            style={{ background: factor.score >= thresh ? color : 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function YieldPage() {
  const advisoryData = useStore(s => s.advisoryData);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [sliderMoisture, setSliderMoisture] = useState(null);
  const [whatifYield, setWhatifYield]       = useState(null);

  const yieldNumRef = useRef(null);

  // Extract sensor values
  const env          = advisoryData?.environment || {};
  const ndviGrid     = advisoryData?.ndvi_grid;
  const ndviMean     = ndviGrid?.values?.length
    ? parseFloat((ndviGrid.values.reduce((a,b)=>a+b,0)/ndviGrid.values.length).toFixed(2))
    : 0.55;
  const soilMoisture = env.root_zone_moisture_pct || 35;
  const rainfall7day = env.rain_forecast_7day_mm  || 10;
  const temp         = env.current_temp_c         || 25;
  const crop         = advisoryData?.crop         || null;

  // Fetch prediction
  useEffect(() => {
    if (!crop) return;
    setLoading(true);
    const USE_REAL_BACKEND = false;

    if (USE_REAL_BACKEND) {
      fetch('/api/yield-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop, ndviMean, soilMoisture, rainfall7day, temp }),
      })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { setData(d); setSliderMoisture(soilMoisture); setWhatifYield(d.predictedYield); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      setTimeout(() => {
        const mockData = {
          predictedYield: 4.25,
          nationalAvg: 3.8,
          yieldVsAvg: 11.8,
          confidence: 88,
          msp: 2275,
          revenueEstimate: 96687,
          season: 'Kharif 2026',
          explanation: `Strong NDVI indices (${ndviMean}) suggest high vegetative vigor. Soil moisture (${soilMoisture}%) is well within the optimal range. The model confidently predicts an above-average yield.`,
          factors: {
            ndvi: { label: 'NDVI', value: ndviMean, score: 1.35 },
            moisture: { label: 'Soil Moisture', value: soilMoisture, score: 1.15 },
            rainfall: { label: '7D Rain', value: rainfall7day, score: 0.95 },
            temperature: { label: 'Temp', value: temp, score: 1.0 }
          }
        };
        setData(mockData);
        setSliderMoisture(soilMoisture);
        setWhatifYield(mockData.predictedYield);
        setLoading(false);
      }, 800);
    }
  }, [crop]);

  // Animate yield number
  useEffect(() => {
    if (!data || !yieldNumRef.current) return;
    gsap.to({ val: 0 }, {
      val: data.predictedYield,
      duration: 1.5, ease: 'power2.out',
      onUpdate() { if (yieldNumRef.current) yieldNumRef.current.textContent = this.targets()[0].val.toFixed(2); },
    });
  }, [data]);

  // What-if recalc (client-side, no API)
  const recalcYield = (newMoisture) => {
    if (!data) return;
    const f = data.factors;
    const newMF  = Math.min(2.0, newMoisture / 38);
    const score  = f.ndvi.score*0.35 + newMF*0.30 + f.rainfall.score*0.20 + f.temperature.score*0.15;
    const newY   = parseFloat((data.nationalAvg * score).toFixed(2));
    setSliderMoisture(newMoisture);
    setWhatifYield(newY);
  };

  // ── Empty / Loading / Error states ────────────────────────
  if (!crop || !advisoryData) {
    return (
      <div className="yield-page yield-empty">
        <div className="yield-empty-inner">
          <div style={{fontSize:'3rem',opacity:0.3}}>📊</div>
          <h2>Yield Predictor</h2>
          <p>Run an advisory on the Dashboard first to unlock AI yield predictions.</p>
          <button className="yield-go-btn" onClick={() => setActivePanel('dashboard')}>Close Panel to Run Advisory</button>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="yield-page yield-empty">
        <div className="yield-spinner" />
        <p className="mono" style={{marginTop:16,color:'rgba(255,255,255,0.4)'}}>
          Computing AI yield model for {crop}…
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="yield-page yield-empty">
        <div style={{fontSize:'2rem'}}>⚠</div>
        <p style={{color:'#FF4500',marginTop:8}}>{error}</p>
        <button className="yield-go-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  if (!data) return null;

  const { predictedYield, yieldVsAvg, confidence, nationalAvg,
          msp, revenueEstimate, season, factors, explanation } = data;
  const deltaPositive = yieldVsAvg >= 0;
  const whatifDelta   = parseFloat((whatifYield - predictedYield).toFixed(2));

  return (
    <div className="yield-page">

      {/* ── TWO HALVES ─────────────────────────────────── */}
      <div className="yield-body">

        {/* LEFT — Hero number */}
        <div className="yield-left">
          <span className="label yield-overline">
            PREDICTED YIELD · {crop.toUpperCase()}
          </span>

          <div className="yield-number-wrapper">
            <div className="yield-number" ref={yieldNumRef}>0.00</div>
            <div className="yield-unit mono">tons / hectare</div>
          </div>

          <div className="yield-comparison">
            <div className="comparison-item">
              <span className="comp-value">{nationalAvg}</span>
              <span className="comp-label mono">National avg</span>
            </div>
            <div className={`comparison-delta ${deltaPositive ? 'positive' : 'negative'}`}>
              <span className="delta-arrow">{deltaPositive ? '▲' : '▼'}</span>
              <span className="delta-pct">{Math.abs(yieldVsAvg)}%</span>
              <span className="delta-sub mono">vs average</span>
            </div>
            <div className="comparison-item">
              <span className="comp-value">₹{(revenueEstimate/1000).toFixed(0)}K</span>
              <span className="comp-label mono">Est. revenue/ha</span>
            </div>
          </div>

          <ConfidenceArc confidence={confidence} />

          <div className="yield-explanation">
            <span className="label" style={{display:'block',marginBottom:8}}>AI ASSESSMENT</span>
            <p>{explanation}</p>
          </div>
        </div>

        {/* RIGHT — Factors + What-if */}
        <div className="yield-right">
          <span className="label" style={{display:'block',marginBottom:20}}>YIELD FACTORS</span>
          {Object.entries(factors).map(([k, f]) => (
            <FactorRow key={k} factorKey={k} factor={f} />
          ))}

          <div className="whatif-section">
            <span className="label" style={{display:'block',marginBottom:8}}>WHAT IF SCENARIO</span>
            <p className="whatif-desc">Adjust irrigation to see yield impact:</p>
            <div className="whatif-slider-row">
              <span className="mono" style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)'}}>
                {soilMoisture}%
              </span>
              <input
                type="range" min="10" max="65"
                value={sliderMoisture ?? soilMoisture}
                className="whatif-slider"
                onChange={e => recalcYield(Number(e.target.value))}
              />
              <span className="mono" style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)',minWidth:32}}>
                {sliderMoisture ?? soilMoisture}%
              </span>
            </div>
            <div className="whatif-result mono">
              Projected: <strong style={{color:'#4ADE80'}}>{whatifYield ?? predictedYield} t/ha</strong>
              {whatifDelta !== 0 && (
                <span className={whatifDelta > 0 ? 'positive' : 'negative'} style={{marginLeft:8}}>
                  {whatifDelta > 0 ? '+' : ''}{whatifDelta} t/ha
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MSP CARD (full width bottom) ─────────────────── */}
      <div className="msp-card glass">
        <div className="msp-col">
          <span className="label">MSP PRICE</span>
          <strong>₹{msp}/quintal</strong>
          <span>Govt. minimum support price</span>
        </div>
        <div className="msp-divider" />
        <div className="msp-col">
          <span className="label">AT PREDICTED YIELD · 1 HECTARE</span>
          <strong className="text-gold">₹{revenueEstimate.toLocaleString('en-IN')}</strong>
          <span>If sold at MSP</span>
        </div>
        <div className="msp-divider" />
        <div className="msp-col">
          <span className="label">SEASON</span>
          <strong>{season}</strong>
          <span>Crop season</span>
        </div>
      </div>

    </div>
  );
}
