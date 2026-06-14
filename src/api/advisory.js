import { buildMockAdvisory } from '../data/mockAdvisory';

/**
 * ============================================================================
 *  BACKEND INTEGRATION SEAM  (Section 7)
 * ----------------------------------------------------------------------------
 *  Today returns a mock after simulated latency. The REAL backend (KunjAgwl/
 *  BhoomiSense `POST /api/advisory`) returns a very different shape than the
 *  Section 6.1 spec, so `adaptBackendResponse()` maps it into the UI shape.
 *  Flip USE_REAL_BACKEND once the backend is running with API keys.
 *
 *  REAL backend response (confirmed from backend/src/server.js):
 *    { success, data: { satellite, weather, market, advisory } }
 *  Request body uses `commodity` (not `crop`) + `state`, `lat`, `lon`.
 *
 *  ⚠ Mismatches vs. spec 6.1 the adapter papers over (flag to backend dev):
 *    - advisory.alerts are plain strings (no severity/type) → inferred.
 *    - action plan is today/tomorrow/day3 strings (no icons) → inferred.
 *    - resourceSaving is a free-text estimate (no numeric breakdown) → parsed.
 *    - no mandi price history / trend → sparkline + trend synthesized.
 *    - satellite gives point NDVI samples, not a grid → grid synthesized.
 *    - no translations block → language switch falls back to English.
 * ============================================================================
 */

const SIMULATED_LATENCY_MS = 1500;

const USE_REAL_BACKEND = true;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/** ndvi_grid.values may be a 2D array or a JSON string — normalize to array. */
export function parseNdviValues(values) {
  if (Array.isArray(values)) return values;
  if (typeof values === 'string') {
    try {
      const parsed = JSON.parse(values);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return [];
}

// ---- adapter helpers --------------------------------------------------------

function inferActionIcon(text = '') {
  const s = text.toLowerCase();
  if (/(do not|don't|avoid|no need to|skip).*(irrigat|water)/.test(s)) return 'no-water';
  if (/irrigat|water/.test(s)) return 'water';
  if (/fertiliz|nitrogen|urea|npk|ndre/.test(s)) return 'fertilizer';
  if (/harvest|sell|mandi|market/.test(s)) return 'harvest';
  if (/spray|pesticide|fungicide|insecticide/.test(s)) return 'spray';
  if (/inspect|monitor|check|scout/.test(s)) return 'inspect';
  if (/sow|seed|plant/.test(s)) return 'seed';
  return 'default';
}

function inferAlert(message = '', pestRisk = '') {
  const s = message.toLowerCase();
  const high =
    /high|severe|immediate|urgent|outbreak|critical/.test(s) ||
    /high|severe/i.test(pestRisk);
  let type = 'weather';
  if (/pest|blight|fungal|disease|insect|aphid|locust/.test(s)) type = 'pest_disease';
  return { severity: high ? 'high' : 'medium', type, message };
}

// synthetic grid function removed.

function num(x) {
  const n = Number(String(x).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Map the real backend payload → the UI shape the components consume. */
export function adaptBackendResponse(raw, { lat, lon, crop, state }) {
  const d = raw?.data || {};
  const sat = d.satellite || {};
  const w = d.weather || {};
  const m = d.market || null;
  const a = d.advisory || {};

  const alerts = Array.isArray(a.alerts) ? a.alerts : [];
  const critical_alerts = alerts
    .filter(Boolean)
    .map((msg) => inferAlert(msg, sat.pestRisk));
  if (sat.pestAlert && !critical_alerts.some((x) => x.message === sat.pestAlert)) {
    critical_alerts.unshift(inferAlert(sat.pestAlert, sat.pestRisk));
  }

  const action_plan = [
    { day: 'Today', icon: inferActionIcon(a.today), action: a.today || 'Monitor your field.', detail: a.irrigationAdvice || '' },
    { day: 'Tomorrow', icon: inferActionIcon(a.tomorrow), action: a.tomorrow || 'Re-check conditions.', detail: a.fertilizerAdvice || '' },
    { day: 'Day 3', icon: inferActionIcon(a.day3), action: a.day3 || 'Review satellite update.', detail: a.harvestAdvice || '' },
  ];

  // Structured fields now from the AI
  const rawSaving = a.resourceSaving || {};
  const resource_savings = {
    water_liters: rawSaving.waterLiters ?? 0,
    electricity_inr: rawSaving.electricityRupees ?? 0,
    fertilizer_kg: rawSaving.fertilizerKg ?? 0,
    fertilizer_inr_saved: rawSaving.fertilizerRupees ?? 0,
    note: rawSaving.summary || '',
  };

  const mandi_price = m
    ? {
        crop: m.crop || m.commodity || crop,
        unit: m.unit || 'per quintal',
        current: Number(m.currentPrice || m.modalPrice) || null,
        trend: m.trend || 'rising',
        trendPercent: m.trendPercent || '',
        market: m.market || '',
        note: m.note || '',
        history_7day: m.history || [],
      }
    : null;

  const environment = {
    root_zone_moisture_pct: Math.round(num(w.soilMoisturePercent) ?? 0),
    rain_forecast_7day_mm: Math.round(num(w.sevenDayPrecipitationMm) ?? 0),
    current_temp_c: Math.round(num(w.currentTempCelsius) ?? 0),
  };

  const ndvi_grid = {
    bounds: { lat_min: lat - 0.004, lat_max: lat + 0.004, lon_min: lon - 0.004, lon_max: lon + 0.004 },
    resolution: 12,
    values: sat.ndviGrid || Array(144).fill(0.5)
  };

  return {
    location: { lat, lon },
    crop,
    state,
    critical_alerts,
    action_plan,
    resource_savings,
    mandi_price,
    environment,
    ndvi_grid,
    // Translations block
    translations: a.translations || {},
    // Keep the raw fused payload around for any deeper views later.
    _raw: d,
  };
}

/**
 * fetchAdvisory — get an advisory for a location + crop + state.
 * @param {{ lat:number, lon:number, crop:string, state:string, language:string }} params
 */
export async function fetchAdvisory({ lat, lon, crop, state, language }) {
  if (USE_REAL_BACKEND) {
    const res = await fetch(`${API_BASE_URL}/api/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // backend expects `commodity`; send `crop` too for forward-compat.
      body: JSON.stringify({ lat, lon, commodity: crop, crop, state, language }),
    });
    if (!res.ok) {
      throw new Error(`Advisory request failed: ${res.status} ${res.statusText}`);
    }
    const raw = await res.json();
    const data = adaptBackendResponse(raw, { lat, lon, crop, state, language });
    return data;
  }

  // ---- MOCK (default) ----
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = buildMockAdvisory({ lat, lon, crop, state });
      resolve(data);
    }, SIMULATED_LATENCY_MS);
  });
}
