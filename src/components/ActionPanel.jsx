import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { fetchAdvisory } from '../api/advisory';
import { CROPS, INDIAN_STATES } from '../data/constants';
import BrutalSelect from './BrutalSelect';
import Icon from './Icon';
import './ActionPanel.css';

/**
 * Action Panel (Section 5) — floating glass-brutalist input card.
 * Desktop: fixed left, vertically centered. Mobile: bottom sheet, collapsible.
 */
export default function ActionPanel() {
  const pinLocation = useStore((s) => s.pinLocation);
  const selectedCrop = useStore((s) => s.selectedCrop);
  const selectedState = useStore((s) => s.selectedState);
  const isLoading = useStore((s) => s.isLoading);
  const setSelectedCrop = useStore((s) => s.setSelectedCrop);
  const setSelectedState = useStore((s) => s.setSelectedState);
  const startLoading = useStore((s) => s.startLoading);
  const setAdvisory = useStore((s) => s.setAdvisory);
  const setError = useStore((s) => s.setError);
  const geoStatus = useStore((s) => s.geoStatus);
  const requestLocation = useStore((s) => s.requestLocation);
  const setDiagnoseOpen = useStore((s) => s.setDiagnoseOpen);

  const [validationMsg, setValidationMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [collapsed, setCollapsed] = useState(false); // mobile bottom-sheet state
  const panelRef = useRef(null);

  const canGenerate = pinLocation && selectedCrop && selectedState && !isLoading;

  const triggerShake = (msg) => {
    setValidationMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleGenerate = async () => {
    if (!pinLocation) {
      triggerShake('Drop a pin on the map first');
      return;
    }
    if (!selectedCrop || !selectedState) {
      triggerShake('Select a crop and state');
      return;
    }
    setValidationMsg('');
    startLoading();
    try {
      const data = await fetchAdvisory({
        lat: pinLocation.lat,
        lon: pinLocation.lon,
        crop: selectedCrop,
        state: selectedState,
      });
      setAdvisory(data);
    } catch (err) {
      console.error('[advisory] fetch failed:', err);
      setError(err.message || 'Failed to generate advisory');
      triggerShake('Something went wrong — try again');
    }
  };

  const coordText = pinLocation
    ? `LAT: ${pinLocation.lat.toFixed(4)}° / LON: ${pinLocation.lon.toFixed(4)}°`
    : 'LAT: --.----° / LON: --.----°';

  return (
    <aside
      ref={panelRef}
      className={`action-panel liquid liquid--framed ${shake ? 'shake' : ''} ${
        collapsed ? 'action-panel--collapsed' : ''
      }`}
    >
      {/* Mobile drag handle / collapse toggle */}
      <button
        className="action-panel__handle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
      >
        <span className="action-panel__grip" />
      </button>

      <div className="action-panel__body">
        <header className="action-panel__header">
          <span className="action-panel__kicker mono">FIELD INPUT</span>
          <h2 className="action-panel__title">
            <Icon name="crosshair" size={22} strokeWidth={2} />
            TARGET
          </h2>
        </header>

        {/* 1. Coordinates */}
        <div className="action-panel__coords mono" data-active={!!pinLocation}>
          <Icon name="pin" size={15} />
          <span>{coordText}</span>
        </div>

        {/* Use my location (auto-requested on reveal; this is a manual retry) */}
        <button
          className="action-panel__locate"
          onClick={requestLocation}
          disabled={geoStatus === 'locating'}
        >
          {geoStatus === 'locating' ? (
            <><span className="brutal-spinner" /> LOCATING…</>
          ) : (
            <><Icon name="navigation" size={15} /> USE MY LOCATION</>
          )}
        </button>
        {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
          <p className="action-panel__geo-note">
            {geoStatus === 'denied'
              ? 'Location denied — drop a pin on the map instead.'
              : 'Location unavailable — drop a pin on the map instead.'}
          </p>
        )}

        {/* 2. Crop selector */}
        <BrutalSelect
          label="Crop"
          value={selectedCrop}
          onChange={setSelectedCrop}
          placeholder="Select crop"
          options={CROPS.map((c) => ({ value: c, label: c }))}
        />

        {/* 3. State selector */}
        <BrutalSelect
          label="State"
          value={selectedState}
          onChange={setSelectedState}
          placeholder="Select state"
          options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
        />

        {/* 4. Generate button */}
        <button
          className="btn-brutal action-panel__generate"
          disabled={!canGenerate}
          onClick={handleGenerate}
        >
          {isLoading ? (
            <>
              <span className="brutal-spinner" />
              ANALYZING…
            </>
          ) : (
            'GENERATE ADVISORY'
          )}
        </button>

        {validationMsg && (
          <p className="action-panel__validation" role="alert">
            {validationMsg}
          </p>
        )}

        {/* Secondary: AI leaf-photo diagnosis */}
        <button className="action-panel__scan" onClick={() => setDiagnoseOpen(true)}>
          <Icon name="scan" size={17} strokeWidth={2} />
          SCAN A LEAF
        </button>
      </div>
    </aside>
  );
}
