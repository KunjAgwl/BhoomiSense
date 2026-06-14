import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Rectangle, Polygon, FeatureGroup, useMap, Tooltip } from 'react-leaflet';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
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

// NDVI color ramp
function ndviColor(v) {
  if (v <= 0.2) return '#8B0000';
  if (v <= 0.4) return '#FF4500';
  if (v <= 0.55) return '#FFD700';
  if (v <= 0.7) return '#90EE90';
  if (v <= 0.85) return '#228B22';
  return '#006400';
}

function DrawControl() {
  const setPinLocation = useStore((s) => s.setPinLocation);
  const setFieldPolygon = useStore((s) => s.setFieldPolygon);
  const revealed = useStore((s) => s.revealed);

  const onCreated = (e) => {
    const { layerType, layer } = e;
    layer._map.removeLayer(layer); // remove native draw layer, we'll declaratively render it
    if (layerType === 'polygon') {
      const latlngs = layer.getLatLngs()[0];
      const centroid = layer.getBounds().getCenter();
      setFieldPolygon(latlngs);
      setPinLocation({ lat: centroid.lat, lon: centroid.lng });
    } else if (layerType === 'marker') {
      const latlng = layer.getLatLng();
      setPinLocation({ lat: latlng.lat, lon: latlng.lng });
      setFieldPolygon(null);
    }
  };

  if (!revealed) return null;

  return (
    <FeatureGroup>
      <EditControl
        position="topleft"
        onCreated={onCreated}
        draw={{
          rectangle: false,
          circle: false,
          circlemarker: false,
          polyline: false,
          polygon: {
            allowIntersection: false,
            drawError: { color: '#e1e100', message: 'Error: shape edges cannot cross!' },
            shapeOptions: { color: '#4ADE80', fillColor: 'rgba(74,222,128,0.15)', weight: 2, dashArray: '6 3' }
          },
          marker: true
        }}
      />
    </FeatureGroup>
  );
}

function GridOverlayPolyArea({ fieldPolygon }) {
  const map = useMap();
  useEffect(() => {
    if (fieldPolygon) {
      map.flyToBounds(L.latLngBounds(fieldPolygon), { padding: [80, 80] });
    }
  }, [fieldPolygon, map]);
  
  if (!fieldPolygon) return null;
  
  // Appox polygon area logic
  let area = 0;
  for (let i = 0; i < fieldPolygon.length; i++) {
    const p1 = fieldPolygon[i], p2 = fieldPolygon[(i + 1) % fieldPolygon.length];
    const y1 = p1.lat * 111000, x1 = p1.lng * 111000 * Math.cos(p1.lat * Math.PI / 180);
    const y2 = p2.lat * 111000, x2 = p2.lng * 111000 * Math.cos(p2.lat * Math.PI / 180);
    area += x1 * y2 - x2 * y1;
  }
  const hectares = (Math.abs(area / 2) / 10000).toFixed(2);

  return (
    <Polygon 
      positions={fieldPolygon} 
      pathOptions={{ color: '#4ADE80', fillColor: 'rgba(74,222,128,0.15)', weight: 2, dashArray: '6 3' }}
    >
      <Tooltip direction="center" permanent className="mono">Field area: ~{hectares} ha</Tooltip>
    </Polygon>
  );
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

function NdviGrid({ grid, fieldPolygon }) {
  const cells = useMemo(() => {
    if (!grid?.values?.length) return [];
    const { values } = grid;
    const rows = 12;
    const cols = 12;
    
    let { lat_min, lat_max, lon_min, lon_max } = grid.bounds;
    if (fieldPolygon) {
      const b = L.latLngBounds(fieldPolygon);
      lat_min = b.getSouth();
      lat_max = b.getNorth();
      lon_min = b.getWest();
      lon_max = b.getEast();
    }
    
    const latSpan = (lat_max - lat_min) / rows;
    const lonSpan = (lon_max - lon_min) / cols;
    const out = [];

    // The backend array is flat, reading row by row
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const delay = i * 50;
        const latTop = lat_max - r * latSpan;
        const latBottom = latTop - latSpan;
        const lonLeft = lon_min + c * lonSpan;
        const lonRight = lonLeft + lonSpan;
        
        const centerLat = (latTop + latBottom) / 2;
        const centerLng = (lonLeft + lonRight) / 2;
        
        if (fieldPolygon) {
            let inside = false;
            for (let m = 0, j = fieldPolygon.length - 1; m < fieldPolygon.length; j = m++) {
                const xi = fieldPolygon[m].lat, yi = fieldPolygon[m].lng;
                const xj = fieldPolygon[j].lat, yj = fieldPolygon[j].lng;
                const intersect = ((yi > centerLng) !== (yj > centerLng)) && (centerLat < (xj - xi) * (centerLng - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            if (!inside) {
                i++;
                continue;
            }
        }
        
        const val = Number(values[i]) || 0;
        out.push({
          key: `ndvi-cell-${r}-${c}`,
          val, delay,
          bounds: [[latBottom, lonLeft], [latTop, lonRight]],
          color: ndviColor(val),
        });
        i++;
      }
    }
    return out;
  }, [grid, fieldPolygon]);

  return (
    <>
      <style>
        {cells.map(c => `.${c.key} { animation: ndvi-fade 0.5s ease-out ${c.delay}ms forwards; opacity: 0; }`).join('\n')}
      </style>
      {cells.map((cell) => (
        <Rectangle
          key={cell.key}
          bounds={cell.bounds}
          pathOptions={{ color: cell.color, weight: 0, fillColor: cell.color, fillOpacity: 0.65, className: cell.key }}
          interactive={true}
        >
          <Tooltip sticky direction="top" opacity={0.9} className="ndvi-tooltip mono">
            NDVI: {cell.val.toFixed(2)}
          </Tooltip>
        </Rectangle>
      ))}
    </>
  );
}

export default function MapLayer() {
  const pinLocation    = useStore((s) => s.pinLocation);
  const fieldPolygon   = useStore((s) => s.fieldPolygon);
  const setFieldPolygon = useStore((s) => s.setFieldPolygon);
  const advisoryData   = useStore((s) => s.advisoryData);
  const revealed       = useStore((s) => s.revealed);
  const advisoryPanelOpen = useStore((s) => s.advisoryPanelOpen);
  const ndviGrid       = advisoryData?.ndvi_grid;
  const mapWrapRef     = useRef(null);
  const location       = useLocation();

  const ndviMean = ndviGrid?.values?.length
    ? (ndviGrid.values.reduce((a, b) => a + b, 0) / ndviGrid.values.length).toFixed(2)
    : '0.00';

  // On pages that don't use the map, make it invisible but keep it mounted
  const isMapPage = ['/', '/dashboard'].includes(location.pathname);
  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    if (!isMapPage) {
      // Hide without display:none — Leaflet stays mounted, just invisible
      el.style.pointerEvents = 'none';
      el.style.visibility = 'hidden';
    } else {
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
      // If we're on dashboard and map was hidden (cinematic), reveal it
      if (revealed) {
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      }
    }
  }, [isMapPage, revealed]);

  // Make map immediately visible when arriving directly at /dashboard
  useEffect(() => {
    if (revealed && mapWrapRef.current) {
      mapWrapRef.current.style.opacity = '1';
      mapWrapRef.current.style.transform = 'scale(1)';
    }
  }, [revealed]);

  useEffect(() => {
    if (pinLocation && revealed) {
      gsap.fromTo('.sat-status-badge',
        { y: -40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }
      );
    }
  }, [pinLocation, revealed]);

  useEffect(() => {
    if (ndviGrid) {
      gsap.fromTo('.ndvi-legend',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }
      );
    }
  }, [ndviGrid]);

  return (
    <div
      className={`map-layer${advisoryPanelOpen ? ' map-layer--split' : ''}`}
      ref={mapWrapRef}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="map-container"
        worldCopyJump
      >
        <TileLayer url={SAT_URL} attribution={SAT_ATTR} maxZoom={19} />
        <TileLayer url={LABELS_URL} maxZoom={19} opacity={0.85} />
        <DrawControl />

        {pinLocation && !fieldPolygon && <Marker position={[pinLocation.lat, pinLocation.lon]} icon={targetPin} />}
        {pinLocation && !fieldPolygon && <PinFlyer pin={pinLocation} />}
        
        <GridOverlayPolyArea fieldPolygon={fieldPolygon} />

        {ndviGrid && <NdviGrid grid={ndviGrid} fieldPolygon={fieldPolygon} />}
        {ndviGrid && !fieldPolygon && <NdviFitter bounds={ndviGrid.bounds} />}
      </MapContainer>

      {/* Clear Button */}
      {fieldPolygon && (
        <button 
          className="clear-poly-btn mono" 
          onClick={() => setFieldPolygon(null)}
          style={{ position: 'absolute', bottom: '2rem', left: '2rem', zIndex: 1000, padding: '0.8rem 1.6rem', background: '#000', color: 'var(--color-signal)', border: '1px solid var(--color-signal)', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}
        >
          ✕ CLEAR FIELD
        </button>
      )}

      <div className="map-tint" aria-hidden="true" />

      {/* ELEMENT 1 — NDVI Legend */}
      {ndviGrid && (
        <div className="ndvi-legend glass">
          <span className="label mono" style={{display:'block', marginBottom:'12px', fontSize:'0.7rem', color:'rgba(255,255,255,0.5)'}}>NDVI HEALTH</span>
          <div className="legend-ramp">
            <div className="ramp-item"><div className="ramp-swatch" style={{background:'#006400'}} /><span>0.85–1.0 · Excellent</span></div>
            <div className="ramp-item"><div className="ramp-swatch" style={{background:'#228B22'}} /><span>0.70–0.85 · Healthy</span></div>
            <div className="ramp-item"><div className="ramp-swatch" style={{background:'#90EE90'}} /><span>0.55–0.70 · Moderate</span></div>
            <div className="ramp-item"><div className="ramp-swatch" style={{background:'#FFD700'}} /><span>0.40–0.55 · Stressed</span></div>
            <div className="ramp-item"><div className="ramp-swatch" style={{background:'#FF4500'}} /><span>0.20–0.40 · Severe</span></div>
            <div className="ramp-item"><div className="ramp-swatch" style={{background:'#8B0000'}} /><span>0.0–0.20 · Critical</span></div>
          </div>
          <div className="legend-mean mono" style={{marginTop:'12px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'12px', fontSize:'0.8rem'}}>
            <span style={{color:'rgba(255,255,255,0.6)'}}>Average:</span> <strong id="ndvi-mean-value" style={{marginLeft:'4px', color:'#fff'}}>{ndviMean}</strong>
          </div>
        </div>
      )}

      {/* ELEMENT 2 — Satellite Scan Status Badge */}
      {pinLocation && (
        <div className="sat-status-badge glass-panel mono">
          <div className="sat-dot pulsing" />
          <span>Sentinel-2 · Last pass: 3 days ago · Cloud cover: 12%</span>
        </div>
      )}

      {revealed && !pinLocation && (
        <div className="map-hint liquid mono">
          <Icon name="crosshair" size={16} />
          SELECT "DRAW FIELD" OR "DROP PIN" ON THE LEFT
        </div>
      )}
    </div>
  );
}
