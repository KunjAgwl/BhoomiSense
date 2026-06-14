import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { fetchAdvisory } from '../api/advisory';
import { CROPS, INDIAN_STATES } from '../data/constants';
import './ActionPanel.css';

// Extract state name from Nominatim address object
function extractState(address) {
  return address?.state || address?.state_district || '';
}

// Nominatim place search — free, no key needed
async function searchPlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=in&addressdetails=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'BhoomiSense/1.0' } });
  if (!res.ok) return [];
  return res.json();
}

// Reverse geocode a lat/lon via backend, fallback to Nominatim directly
async function reverseGeocode(lat, lon) {
  // Try backend first
  try {
    const res = await fetch('/api/reverse-geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) return data.state;
    }
  } catch { /* fall through */ }

  // Fallback: call Nominatim directly from the browser
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'User-Agent': 'BhoomiSense/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      return extractState(data.address);
    }
  } catch { /* give up */ }

  return '';
}

export default function ActionPanel() {
  const pinLocation    = useStore((s) => s.pinLocation);
  const setPinLocation = useStore((s) => s.setPinLocation);
  const selectedCrop   = useStore((s) => s.selectedCrop);
  const selectedState  = useStore((s) => s.selectedState);
  const isLoading      = useStore((s) => s.isLoading);
  const setSelectedCrop  = useStore((s) => s.setSelectedCrop);
  const setSelectedState = useStore((s) => s.setSelectedState);
  const startLoading   = useStore((s) => s.startLoading);
  const setAdvisory    = useStore((s) => s.setAdvisory);
  const setError       = useStore((s) => s.setError);

  const advisoryPanelOpen = useStore((s) => s.advisoryPanelOpen);

  const [isDetecting, setIsDetecting]     = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [showAllCrops, setShowAllCrops]   = useState(false);
  const searchDebounce = useRef(null);

  // Auto-detect state when pin changes (from map click)
  useEffect(() => {
    if (!pinLocation) return;
    let active = true;
    setIsDetecting(true);
    reverseGeocode(pinLocation.lat, pinLocation.lon).then((state) => {
      if (active && state) setSelectedState(state);
    }).finally(() => { if (active) setIsDetecting(false); });
    return () => { active = false; };
  }, [pinLocation, setSelectedState]);

  // Debounced place search
  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchResults([]);
    clearTimeout(searchDebounce.current);
    if (!val.trim() || val.length < 3) return;
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlace(val);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handlePickPlace = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    // Set pin — this will also trigger the reverse geocode useEffect above,
    // but we can pre-fill state immediately from the search result's address
    const stateFromSearch = extractState(result.address);
    setPinLocation({ lat, lon });
    if (stateFromSearch) setSelectedState(stateFromSearch);
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(', '));
    setSearchResults([]);
  };

  const canGenerate = !!(pinLocation && selectedCrop && selectedState && !isLoading);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    startLoading();
    try {
      const data = await fetchAdvisory({
        lat: pinLocation.lat,
        lon: pinLocation.lon,
        crop: selectedCrop,
        state: selectedState,
        language: useStore.getState().selectedLanguage,
      });
      setAdvisory(data);
    } catch (err) {
      setError(err.message || 'Failed to generate advisory');
    }
  };

  const coordLat  = pinLocation?.lat?.toFixed(4) ?? '--.----';
  const coordLon  = pinLocation?.lon?.toFixed(4) ?? '--.----';
  const coordText = `${coordLat}°N ${coordLon}°E`;

  const visibleCrops = showAllCrops ? CROPS : CROPS.slice(0, 4);

  return (
    <div className={`command-pod${advisoryPanelOpen ? ' command-pod--split' : ''}`}>
      {/* Header */}
      <div className="pod-header">
        <div className="pod-signal-dot" />
        <span className="pod-label mono">FIELD COMMAND</span>
        <span className="pod-coords mono">{coordText}</span>
      </div>

      {/* Place search */}
      <div className="pod-search-wrap">
        <input
          className="pod-search-input mono"
          type="text"
          placeholder="Search a village, city or district…"
          value={searchQuery}
          onChange={handleSearchInput}
          autoComplete="off"
        />
        {searching && <span className="pod-search-spinner mono">…</span>}
        {searchResults.length > 0 && (
          <ul className="pod-search-results">
            {searchResults.map((r) => (
              <li key={r.place_id} onMouseDown={() => handlePickPlace(r)}>
                {r.display_name.split(',').slice(0, 3).join(', ')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Location badge */}
      <div className="pod-location-badge">
        <span className="pod-pin-icon">📍</span>
        <span className="pod-location-text">
          {isDetecting ? 'Detecting location…' : selectedState || 'Drop a pin or search above'}
        </span>
        {selectedState && !isDetecting && (
          <span className="badge-detected">✓</span>
        )}
      </div>

      {/* Crop selector */}
      <div className="pod-section-label mono">SELECT CROP</div>
      <div className="crop-pill-row">
        {visibleCrops.map((c) => (
          <button
            key={c}
            className={`crop-pill${selectedCrop === c ? ' active' : ''}`}
            onClick={() => setSelectedCrop(c)}
          >
            {c}
          </button>
        ))}
        {CROPS.length > 4 && (
          <button
            className="crop-pill crop-pill-more"
            onClick={() => setShowAllCrops((v) => !v)}
          >
            {showAllCrops ? 'Less ↑' : 'More ↓'}
          </button>
        )}
      </div>

      {/* Generate button */}
      <button
        className={`generate-btn${isLoading ? ' loading' : ''}`}
        disabled={!canGenerate}
        onClick={handleGenerate}
        title={!pinLocation ? 'Drop a pin first' : !selectedCrop ? 'Select a crop' : !selectedState ? 'Detecting state…' : ''}
      >
        <span className="btn-icon">⬡</span>
        <span className="btn-text">
          {isLoading ? 'Scanning satellite data…' : 'Generate Advisory'}
        </span>
      </button>

      {/* State override — shown if detection failed */}
      {pinLocation && !selectedState && !isDetecting && (
        <div className="state-override-wrap">
          <select
            className="state-override-select mono"
            value=""
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="" disabled>Select state manually…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
