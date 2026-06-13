import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { buildMockDiagnosis } from '../data/mockDiagnosis';
import Icon from './Icon';
import './DiagnosisPanel.css';

/**
 * Leaf Photo Diagnosis (Feature 7) — synthetic-data version.
 * Upload a leaf photo → preview → "Analyze" runs a mocked diagnosis
 * (no API / no keys) matching the backend `/api/diagnose-image` shape.
 */

const SEVERITY_CLASS = {
  NONE: 'ok',
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
};
const URGENCY_LABEL = {
  IMMEDIATE: 'Act immediately',
  WITHIN_3_DAYS: 'Within 3 days',
  MONITOR: 'Monitor',
};

export default function DiagnosisPanel() {
  const open = useStore((s) => s.diagnoseOpen);
  const setOpen = useStore((s) => s.setDiagnoseOpen);

  const [imageUrl, setImageUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  if (!open) return null;

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setResult(null);
    setAnalyzing(false);
  };
  const close = () => {
    reset();
    setOpen(false);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
  };

  const analyze = () => {
    setAnalyzing(true);
    setResult(null);
    // Synthetic latency so the scan feels real.
    setTimeout(() => {
      setResult(buildMockDiagnosis());
      setAnalyzing(false);
    }, 1600);
  };

  return (
    <div className="diag-overlay" role="dialog" aria-modal="true" aria-label="Leaf diagnosis">
      <div className="diag-backdrop" onClick={close} />
      <div className="diag liquid liquid--framed">
        <header className="diag__header">
          <div>
            <span className="diag__kicker mono">AI CROP DOCTOR</span>
            <h2 className="diag__title">
              <Icon name="scan" size={22} strokeWidth={2} />
              LEAF SCAN
            </h2>
          </div>
          <button className="diag__close" onClick={close} aria-label="Close">
            <Icon name="close" size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="diag__body">
          {/* Drop / preview zone */}
          <button
            className={`diag__drop ${imageUrl ? 'has-image' : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="Leaf preview" className="diag__preview" />
            ) : (
              <span className="diag__drop-inner">
                <Icon name="upload" size={32} />
                <span className="diag__drop-text">Tap to upload a leaf photo</span>
                <span className="diag__drop-sub mono">JPG / PNG · runs on synthetic data</span>
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onFile}
            />
          </button>

          {imageUrl && !result && (
            <button className="btn-brutal diag__analyze" onClick={analyze} disabled={analyzing}>
              {analyzing ? (
                <>
                  <span className="brutal-spinner" /> ANALYZING…
                </>
              ) : (
                <>
                  <Icon name="scan" size={18} strokeWidth={2} /> ANALYZE LEAF
                </>
              )}
            </button>
          )}

          {/* Result */}
          {result && (
            <div className="diag__result">
              <div className={`diag__verdict diag__verdict--${SEVERITY_CLASS[result.severity] || 'mild'}`}>
                <div className="diag__verdict-top">
                  <span className="diag__disease">{result.diseaseName}</span>
                  <span className="diag__sev mono">{result.severity}</span>
                </div>
                <div className="diag__badges">
                  <span className="diag__badge mono">CONF: {result.confidence}</span>
                  <span className="diag__badge mono">{URGENCY_LABEL[result.urgency] || result.urgency}</span>
                </div>
              </div>

              <Row icon="bug" label="Cause" text={result.cause} />
              <Row icon="flask" label="Treatment" text={result.treatment} />
              <Row icon="leaf" label="Prevention" text={result.prevention} />

              <button className="diag__again" onClick={reset}>
                <Icon name="refresh" size={15} /> Scan another leaf
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, text }) {
  return (
    <div className="diag__row">
      <span className="diag__row-icon"><Icon name={icon} size={18} /></span>
      <div>
        <span className="diag__row-label mono">{label}</span>
        <p className="diag__row-text">{text}</p>
      </div>
    </div>
  );
}
