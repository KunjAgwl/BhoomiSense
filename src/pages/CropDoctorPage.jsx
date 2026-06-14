import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import gsap from 'gsap';
import './CropDoctorPage.css';

const SCAN_MESSAGES = [
  'Analyzing spectral markers...',
  'Cross-referencing disease database...',
  'Generating treatment plan...',
];

const SEVERITY_COLOR = {
  NONE:     '#4ADE80',
  MILD:     '#4ADE80',
  MODERATE: '#FFD700',
  SEVERE:   '#FF4500',
  UNKNOWN:  '#888',
};

const URGENCY_COLOR = {
  IMMEDIATE:    '#FF4500',
  WITHIN_3_DAYS:'#FFD700',
  MONITOR:      '#4ADE80',
};

export default function CropDoctorPage() {
  const navigate = useNavigate();
  const selectedCrop  = useStore((s) => s.selectedCrop);
  const selectedState = useStore((s) => s.selectedState);
  const pinLocation   = useStore((s) => s.pinLocation);

  const [phase, setPhase]         = useState('idle'); // idle | scanning | result
  const [imageUrl, setImageUrl]   = useState(null);
  const [imageB64, setImageB64]   = useState(null);
  const [scanMsg, setScanMsg]     = useState(SCAN_MESSAGES[0]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [error, setError]         = useState(null);

  const fileRef      = useRef(null);
  const scanLineRef  = useRef(null);
  const intervalRef  = useRef(null);
  const zoneRef      = useRef(null);

  // Marching-ants border via CSS animation on the zone wrapper
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
      const b64 = e.target.result.split(',')[1];
      setImageB64(b64);
      startScan(b64);
    };
    reader.readAsDataURL(file);
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const startScan = async (b64) => {
    setPhase('scanning');
    setError(null);

    // Cycle scan messages
    let idx = 0;
    setScanMsg(SCAN_MESSAGES[0]);
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % SCAN_MESSAGES.length;
      setScanMsg(SCAN_MESSAGES[idx]);
    }, 1200);

    // Wait 3.6s for the visual scan animation, then hit the API
    await new Promise((r) => setTimeout(r, 3600));
    clearInterval(intervalRef.current);

    try {
      const res = await fetch('/api/diagnose-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: b64,
          lat:       pinLocation?.lat || 20.5,
          lon:       pinLocation?.lon || 78.9,
          state:     selectedState    || 'India',
          commodity: selectedCrop     || 'crop',
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setDiagnosis(json.data?.diagnosis || json.diagnosis);
      setPhase('result');
      setTimeout(() => {
        gsap.fromTo('.diagnosis-result', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });
      }, 50);
    } catch (err) {
      setError(err.message);
      setPhase('idle');
    }
  };

  const reset = () => {
    setPhase('idle');
    setImageUrl(null);
    setImageB64(null);
    setDiagnosis(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const addToAdvisory = () => {
    if (!diagnosis) return;
    const params = new URLSearchParams({ diagnosis: JSON.stringify(diagnosis) });
    navigate(`/dashboard?${params.toString()}`);
  };

  // Confidence arc (SVG circle)
  const ConfidenceArc = ({ confidence, severity }) => {
    const pct = confidence === 'HIGH' ? 0.9 : confidence === 'MEDIUM' ? 0.65 : 0.4;
    const r = 36;
    const circ = 2 * Math.PI * r;
    const color = SEVERITY_COLOR[severity] || '#4ADE80';
    return (
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="42" cy="42" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x="42" y="47" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="monospace">
          {confidence}
        </text>
      </svg>
    );
  };

  return (
    <div className="crop-doctor-page">
      <div className="crop-doctor-container">

        <div className="cd-header">
          <h1 className="cd-title">Crop Doctor</h1>
          <p className="cd-subtitle mono">AI-powered leaf disease diagnostics</p>
        </div>

        {/* ── SCAN ZONE ─────────────────────────────────────── */}
        <div
          ref={zoneRef}
          className={`scan-zone ${phase === 'scanning' ? 'scanning' : ''} ${phase === 'result' ? 'has-result' : ''}`}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => phase === 'idle' && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onInputChange}
          />

          {phase === 'idle' && !imageUrl && (
            <div className="scan-zone-idle">
              <div className="scan-crosshair">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="20" stroke="#4ADE80" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="32" y1="8" x2="32" y2="20" stroke="#4ADE80" strokeWidth="1.5" />
                  <line x1="32" y1="44" x2="32" y2="56" stroke="#4ADE80" strokeWidth="1.5" />
                  <line x1="8" y1="32" x2="20" y2="32" stroke="#4ADE80" strokeWidth="1.5" />
                  <line x1="44" y1="32" x2="56" y2="32" stroke="#4ADE80" strokeWidth="1.5" />
                  <circle cx="32" cy="32" r="3" fill="#4ADE80" />
                </svg>
              </div>
              <p className="scan-idle-title">Drop a leaf photo here</p>
              <span className="scan-idle-sub mono">or tap to upload from camera</span>
            </div>
          )}

          {(phase === 'scanning' || phase === 'result') && imageUrl && (
            <img src={imageUrl} alt="Leaf scan" className="scan-image" />
          )}

          {phase === 'scanning' && (
            <div ref={scanLineRef} className="scan-line" />
          )}
        </div>

        {/* Scan status text */}
        {phase === 'scanning' && (
          <div className="scan-status mono">{scanMsg}</div>
        )}

        {error && (
          <div className="cd-error mono">⚠ {error} — <button onClick={reset} className="cd-link">Try again</button></div>
        )}

        {/* ── RESULT ─────────────────────────────────────────── */}
        {phase === 'result' && diagnosis && (
          <div className="diagnosis-result" style={{ opacity: 0 }}>

            {/* Threat level badge */}
            <div className={`threat-badge severity-${(diagnosis.severity || 'NONE').toLowerCase()}`}>
              <span className="threat-dot" />
              <span className="threat-label">
                {diagnosis.diseaseName === 'Healthy' ? '✓ HEALTHY' :
                  diagnosis.severity === 'SEVERE' ? '⚠ CRITICAL' :
                  diagnosis.severity === 'MODERATE' ? '⚡ MODERATE' : '✓ MILD'}
              </span>
            </div>

            {/* Two-column diagnosis */}
            <div className="diagnosis-cols">

              {/* LEFT: Primary diagnosis card */}
              <div className="diagnosis-card glass-card">
                <div className="diag-top">
                  <ConfidenceArc confidence={diagnosis.confidence} severity={diagnosis.severity} />
                  <div>
                    <div className="diag-name">{diagnosis.diseaseName}</div>
                    <div className="diag-cause mono">{diagnosis.cause}</div>
                  </div>
                </div>
                <p className="diag-desc">{diagnosis.treatment?.slice(0, 120)}...</p>
              </div>

              {/* RIGHT: Treatment plan */}
              <div className="treatment-card glass-card">
                <div className="treatment-header mono">PRESCRIBED ACTION</div>
                {[diagnosis.treatment, diagnosis.prevention].filter(Boolean).map((step, i) => (
                  <div className="treatment-step" key={i}>
                    <span className="step-num mono">0{i + 1}</span>
                    <p className="step-text">{step}</p>
                    <span
                      className="urgency-tag mono"
                      style={{ color: URGENCY_COLOR[diagnosis.urgency] || '#888', borderColor: URGENCY_COLOR[diagnosis.urgency] || '#888' }}
                    >
                      {i === 0 ? diagnosis.urgency?.replace('_', ' ') : 'PREVENTIVE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="cd-actions">
              <button className="cd-btn-secondary mono" onClick={reset}>
                ← Scan another
              </button>
              <button className="cd-btn-primary" onClick={addToAdvisory}>
                Add to Advisory →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
