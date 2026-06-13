import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store/useStore';
import Icon from './Icon';
import './MapLayer.css';

/**
 * Map Layer (Section 4, reworked) — fixed full-screen LIVE satellite map.
 * Revealed by the scroll dive (ScrollHeroSection writes opacity/scale directly
 * onto `.map-layer`). Click to drop a target pin once revealed; NDVI grid
 * overlay renders after an advisory arrives.
 */

const DEFAULT_CENTER = [22.9, 79.0]; // central India
const DEFAULT_ZOOM = 5;

// Esri World Imagery — free, no API key, true satellite imagery (Section 4).
const SAT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SAT_ATTR = 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics';
// Reference labels (roads/places) so the satellite view stays legible.
const LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// Liquid-glass target pin (SVG, neon).
const targetPin = L.divIcon({
  className: 'target-pin-wrap',
  html: `
    <div class="target-pin">
      <span class="target-pin__pulse"></span>
      <svg width="34" height="44" viewBox="0 0 34 44" fill="none">
        <path d="M17 43C17 43 31 26 31 15A14 14 0 1 0 3 15C3 26 17 43 17 43Z"
              fill="rgba(8,16,10,0.65)" stroke="#39FF6A" stroke-width="2.5"/>
        <circle cx="17" cy="15" r="4.5" fill="#39FF6A"/>
      </svg>
    </div>`,
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

// NDVI color ramp: red (low) → yellow → green (high). The one allowed gradient.
function ndviColor(v) {
  const t = Math.max(0, Math.min(1, v));
  let r, g;
  if (t < 0.5) {
    r = 255;
    g = Math.round(255 * (t / 0.5));
  } else {
    r = Math.round(255 * (1 - (t - 0.5) / 0.5));
    g = 200 + Math.round(55 * ((t - 0.5) / 0.5));
  }
  return `rgb(${r}, ${g}, 50)`;
}

function ClickHandler() {
  const setPinLocation = useStore((s) => s.setPinLocation);
  const revealed = useStore((s) => s.revealed);
  useMapEvents({
    click(e) {
      if (!revealed) return; // ignore clicks during the cinematic
      setPinLocation({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

function NdviFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const b = L.latLngBounds(
      [bounds.lat_min, bounds.lon_min],
      [bounds.lat_max, bounds.lon_max]
    );
    map.flyToBounds(b, { padding: [80, 80], maxZoom: 16, duration: 1.4 });
  }, [map, bounds]);
  return null;
}

// Fly to the pin when first dropped, so the satellite imagery zooms to the plot.
function PinFlyer({ pin }) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.flyTo([pin.lat, pin.lon], Math.max(map.getZoom(), 15), {
      duration: 1.6,
      easeLinearity: 0.25,
    });
  }, [map, pin]);
  return null;
}

function NdviGrid({ grid }) {
  const cells = useMemo(() => {
    if (!grid?.values?.length) return [];
    const { bounds, values } = grid;
    const rows = values.length;
    const cols = values[0].length;
    const latSpan = (bounds.lat_max - bounds.lat_min) / rows;
    const lonSpan = (bounds.lon_max - bounds.lon_min) / cols;
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const latTop = bounds.lat_max - r * latSpan;
        const latBottom = latTop - latSpan;
        const lonLeft = bounds.lon_min + c * lonSpan;
        const lonRight = lonLeft + lonSpan;
        out.push({
          key: `${r}-${c}`,
          bounds: [
            [latBottom, lonLeft],
            [latTop, lonRight],
          ],
          color: ndviColor(values[r][c]),
        });
      }
    }
    return out;
  }, [grid]);

  return (
    <>
      {cells.map((cell) => (
        <Rectangle
          key={cell.key}
          bounds={cell.bounds}
          pathOptions={{ color: cell.color, weight: 0, fillColor: cell.color, fillOpacity: 0.5 }}
          interactive={false}
        />
      ))}
    </>
  );
}

export default function MapLayer() {
  const pinLocation = useStore((s) => s.pinLocation);
  const advisoryData = useStore((s) => s.advisoryData);
  const revealed = useStore((s) => s.revealed);
  const ndviGrid = advisoryData?.ndvi_grid;

  return (
    <div className="map-layer">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="map-container"
        worldCopyJump
      >
        <TileLayer url={SAT_URL} attribution={SAT_ATTR} maxZoom={19} />
        <TileLayer url={LABELS_URL} maxZoom={19} opacity={0.85} />
        <ClickHandler />

        {pinLocation && <Marker position={[pinLocation.lat, pinLocation.lon]} icon={targetPin} />}
        {pinLocation && <PinFlyer pin={pinLocation} />}

        {ndviGrid && <NdviGrid grid={ndviGrid} />}
        {ndviGrid && <NdviFitter bounds={ndviGrid.bounds} />}
      </MapContainer>

      {/* Liquid-glass scan-line / tint so the UI reads as glass over imagery */}
      <div className="map-tint" aria-hidden="true" />

      {revealed && !pinLocation && (
        <div className="map-hint liquid mono">
          <Icon name="crosshair" size={16} />
          CLICK THE MAP TO DROP A TARGET PIN
        </div>
      )}
    </div>
  );
}
