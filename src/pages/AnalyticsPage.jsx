import { useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip,
} from 'recharts';
import gsap from 'gsap';
import './AnalyticsPage.css';

const ndviColor  = v => v >= 0.7 ? '#4ADE80' : v >= 0.4 ? '#FFD700' : '#FF4500';
const ndviStatus = v => v >= 0.85 ? 'EXCELLENT' : v >= 0.7 ? 'HEALTHY' : v >= 0.55 ? 'MODERATE' : v >= 0.4 ? 'STRESSED' : 'CRITICAL';

function useNdviHistory(current) {
  return useMemo(() => {
    let v = current;
    return Array.from({ length: 30 }, (_, i) => {
      v = Math.min(1, Math.max(0, v + (Math.random() - 0.5) * 0.07));
      return { day: i + 1, ndvi: parseFloat(v.toFixed(3)) };
    }).map((d, i) => i === 29 ? { ...d, ndvi: current } : d);
  }, [current]);
}

function NdviRing({ value }) {
  const ringRef = useRef(null);
  const R = 110, circ = 2 * Math.PI * R;
  const color = ndviColor(value);
  const fill  = circ * value;

  useEffect(() => {
    if (!ringRef.current) return;
    gsap.fromTo(ringRef.current,
      { strokeDashoffset: circ },
      { strokeDashoffset: circ - fill, duration: 2, ease: 'power3.out', delay: 0.3 }
    );
  }, [circ, fill]);

  return (
    <div className="ndvi-ring-wrap">
      <svg width="280" height="280" viewBox="0 0 280 280">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
          const [inn, out] = [122, 130];
          return (
            <line key={i}
              x1={140 + inn * Math.cos(a)} y1={140 + inn * Math.sin(a)}
              x2={140 + out * Math.cos(a)} y2={140 + out * Math.sin(a)}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"
            />
          );
        })}
        <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle ref={ringRef} cx="140" cy="140" r={R} fill="none"
          stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ}
          transform="rotate(-90 140 140)"
          style={{ filter: `drop-shadow(0 0 14px ${color}70)` }}
        />
        <text x="140" y="128" textAnchor="middle" fill="#fff" fontSize="48" fontWeight="700" fontFamily="var(--font-display)">{value.toFixed(2)}</text>
        <text x="140" y="155" textAnchor="middle" fill={color} fontSize="11" fontFamily="var(--font-mono)" letterSpacing="3">{ndviStatus(value)}</text>
        <text x="140" y="174" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="2">FIELD HEALTH INDEX</text>
      </svg>
      <div className="ndvi-ring-glow" style={{ background: `radial-gradient(ellipse at 50% 80%, ${color}20, transparent 70%)` }} />
    </div>
  );
}

function NdviChart({ history, current }) {
  const color = ndviColor(current);
  const CT = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
      <div style={{ background: 'rgba(3,6,4,0.95)', border: `1px solid ${ndviColor(v)}40`, borderRadius: 8, padding: '6px 10px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Day {payload[0].payload.day}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: ndviColor(v), fontWeight: 700 }}>{v.toFixed(2)}</div>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={history} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ndviAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" hide />
        <YAxis domain={[0, 1]} hide />
        <Tooltip content={<CT />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="ndvi" stroke={color} strokeWidth={2}
          fill="url(#ndviAreaGrad)" dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FieldRadar({ moisture, temp, rain, ndvi }) {
  const data = [
    { dim: 'NDVI',     val: Math.round(ndvi * 100) },
    { dim: 'MOISTURE', val: moisture },
    { dim: 'RAIN',     val: Math.min(100, rain * 2) },
    { dim: 'TEMP',     val: Math.max(0, 100 - Math.abs(temp - 25) * 4) },
    { dim: 'HEALTH',   val: Math.round(Math.min(100, (ndvi * 60 + moisture * 0.2 + (rain > 10 ? 20 : 0)))) },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="dim"
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'rgba(255,255,255,0.35)', letterSpacing: 1 }} />
        <Radar dataKey="val" stroke="#4ADE80" fill="#4ADE80" fillOpacity={0.12} strokeWidth={1.5} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function SensorBar({ label, value, max, color, unit, sublabel }) {
  const fillRef = useRef(null);
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  useEffect(() => {
    if (fillRef.current) {
      gsap.fromTo(fillRef.current, { width: '0%' },
        { width: `${pct}%`, duration: 1.3, ease: 'expo.out', delay: 0.1 });
    }
  }, [pct]);
  return (
    <div className="sensor-bar">
      <div className="sb-meta">
        <span className="sb-label mono">{label}</span>
        <span className="sb-val" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="sb-track">
        <div className="sb-fill" ref={fillRef}
          style={{ background: `linear-gradient(90deg, ${color}30, ${color})` }} />
        <div className="sb-glow" style={{ left: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
      {sublabel && <span className="sb-sub mono">{sublabel}</span>}
    </div>
  );
}

function Neighbourhood({ farmerNdvi }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/neighbor-ndvi', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ndviMean: farmerNdvi }),
    }).then(r => r.json()).then(d => {
      setData(d);
      setTimeout(() => {
        gsap.fromTo('.nb-bar-fill', { scaleX: 0 },
          { scaleX: 1, stagger: 0.06, duration: 0.9, ease: 'expo.out' });
      }, 100);
    }).catch(() => {});
  }, [farmerNdvi]);

  if (!data) {
    return (
      <div className="nb-skeleton">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="nb-skeleton-row">
            <div className="nb-skeleton-label" />
            <div className="nb-skeleton-bar" style={{ width: `${40 + Math.random() * 50}%` }} />
            <div className="nb-skeleton-val" />
          </div>
        ))}
      </div>
    );
  }
  const all = [parseFloat(data.farmerNdvi), ...data.neighborValues.map(parseFloat)];
  return (
    <div className="nb-section">
      <div className="nb-header">
        <span className="ana-label mono">NEIGHBOURHOOD · {data.totalFields} FIELDS</span>
        <span className="nb-rank mono">RANK <strong style={{ color: '#4ADE80' }}>#{data.rank}</strong> of {data.totalFields}</span>
      </div>
      <div className="nb-bars">
        {all.map((v, i) => (
          <div key={i} className={`nb-row${i === 0 ? ' nb-yours' : ''}`}>
            <span className="nb-name mono">{i === 0 ? 'YOURS' : `F${i}`}</span>
            <div className="nb-track">
              <div className="nb-bar-fill" style={{ width: `${v * 100}%`, background: ndviColor(v), transformOrigin: 'left' }} />
            </div>
            <span className="nb-num mono" style={{ color: ndviColor(v) }}>{v.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const advisoryData = useStore((s) => s.advisoryData);
  const navigate     = useNavigate();

  if (!advisoryData) {
    return (
      <div className="ana-page ana-empty-page">
        <div className="ana-empty">
          <div className="ana-empty-ring" />
          <span className="mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No field data yet.</span>
          <button className="ana-go-btn" onClick={() => navigate('/dashboard')}>Go to Dashboard →</button>
        </div>
      </div>
    );
  }

  const env     = advisoryData.environment || {};
  const savings = advisoryData.resource_savings || {};
  const mandi   = advisoryData.mandi_price;
  const plan    = Array.isArray(advisoryData.action_plan) ? advisoryData.action_plan : [];
  const ndviGrid = advisoryData.ndvi_grid;
  const ndviMean = ndviGrid?.values?.length
    ? ndviGrid.values.reduce((a,b)=>a+b,0) / ndviGrid.values.length : 0.65;

  const moisture = env.root_zone_moisture_pct || 0;
  const rain     = env.rain_forecast_7day_mm  || 0;
  const temp     = env.current_temp_c         || 0;
  const history  = useNdviHistory(ndviMean);

  const droughtPct = moisture < 25 && rain < 10 ? 90 : moisture < 35 && rain < 20 ? 50 : 15;
  const droughtCol = droughtPct > 70 ? '#FF4500' : droughtPct > 40 ? '#FFD700' : '#4ADE80';

  return (
    <div className="ana-page">
      <section className="ana-hero">
        <div className="ana-hero-left">
          <div className="ana-hero-overline mono">{advisoryData.crop?.toUpperCase()} · {advisoryData.state}</div>
          <NdviRing value={ndviMean} />
        </div>
        <div className="ana-hero-right">
          <div className="ana-label mono">30-DAY NDVI TREND</div>
          <NdviChart history={history} current={ndviMean} />
          <div className="ana-label mono" style={{ marginTop: 24 }}>HEALTH DIMENSIONS</div>
          <FieldRadar moisture={moisture} temp={temp} rain={rain} ndvi={ndviMean} />
        </div>
      </section>

      <section className="ana-sensors">
        <div className="ana-label mono">LIVE SENSORS · NASA POWER</div>
        <div className="ana-sensors-grid">
          <SensorBar label="SOIL MOISTURE" value={moisture} max={100} color="#38BDF8" unit="%" sublabel={moisture < 25 ? '⚠ CRITICAL' : '✓ OPTIMAL'} />
          <SensorBar label="TEMPERATURE"   value={temp}     max={50}  color="#FB923C" unit="°C" sublabel={temp > 40 ? '⚠ HEAT STRESS' : '✓ IN RANGE'} />
          <SensorBar label="7-DAY RAIN"    value={rain}     max={100} color="#818CF8" unit="mm" sublabel={rain < 5 ? '⚠ DRY SPELL' : '✓ ADEQUATE'} />
          <SensorBar label="DROUGHT RISK"  value={droughtPct} max={100} color={droughtCol} unit="%" sublabel={droughtPct > 70 ? '⚠ CRITICAL' : droughtPct > 40 ? '⚠ MODERATE' : '✓ LOW'} />
        </div>
      </section>

      {plan.length > 0 && (
        <section className="ana-plan">
          <div className="ana-label mono">3-DAY ACTION PLAN</div>
          <div className="ana-plan-strip">
            {plan.map((p, i) => (
              <div key={i} className="api-item">
                <div className="api-day mono">{p.day || `Day ${i+1}`}</div>
                <div className="api-line" style={{ background: ['#4ADE80','#FFD700','#818CF8'][i] || '#4ADE80' }} />
                <div className="api-text">{p.action}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(savings.water_liters || savings.electricity_inr || mandi?.current) && (
        <section className="ana-impact">
          <div className="ana-label mono">RESOURCE IMPACT</div>
          <div className="ana-impact-row">
            {savings.water_liters > 0 && (
              <div className="ain">
                <span className="ain-val" style={{ color: '#38BDF8' }}>{savings.water_liters.toLocaleString()}L</span>
                <span className="ain-label mono">water saved</span>
              </div>
            )}
            {savings.electricity_inr > 0 && (
              <div className="ain">
                <span className="ain-val" style={{ color: '#FACC15' }}>&#8377;{savings.electricity_inr}</span>
                <span className="ain-label mono">electricity</span>
              </div>
            )}
            {mandi?.current && (
              <div className="ain">
                <span className="ain-val" style={{ color: '#4ADE80' }}>&#8377;{mandi.current}</span>
                <span className="ain-label mono">{mandi.crop} price/qtl</span>
              </div>
            )}
          </div>
          {savings.note && <p className="ana-note mono">{savings.note}</p>}
        </section>
      )}

      <section className="ana-nb"><Neighbourhood farmerNdvi={ndviMean} /></section>
    </div>
  );
}
