import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import './PlannerPage.css';

const TYPE_COLOR = {
  sow:       '#4ADE80',
  irrigate:  '#38BDF8',
  fertilize: '#C9A84C',
  spray:     '#A78BFA',
  inspect:   '#94A3B8',
  harvest:   '#F59E0B',
  prepare:   '#6B7280',
};

const TRACK_WIDTH  = 3600; // px — 20px per day × 180 days
const DAY_PX       = 20;

function daysSince(startDate) {
  const start = new Date(startDate);
  const now   = new Date();
  return Math.max(0, Math.floor((now - start) / 86400000));
}

function TimelineEvent({ event, position }) {
  const color = TYPE_COLOR[event.type] || '#fff';
  const leftPx = event.day * DAY_PX;

  return (
    <div
      className={`tl-event tl-${position}`}
      style={{ left: leftPx, '--type-color': color }}
      data-event-id={event.day}
    >
      <div className="tl-dot" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
      <div className="tl-stem" />
      <div className="tl-card">
        <span className="tl-icon">{event.icon}</span>
        <span className="tl-day mono">Day {event.day}</span>
        <strong className="tl-activity">{event.activity}</strong>
      </div>
    </div>
  );
}

function MonthMarkers({ startDate }) {
  const start = new Date(startDate || new Date());
  const markers = [];
  for (let m = 0; m < 6; m++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + m);
    const dayOffset = Math.floor((d - start) / 86400000);
    const leftPx = dayOffset * DAY_PX;
    markers.push(
      <div key={m} className="month-marker" style={{ left: leftPx }}>
        <div className="month-tick" />
        <span className="month-label mono">
          {d.toLocaleString('default', { month: 'short' })} {d.getFullYear()}
        </span>
      </div>
    );
  }
  return <>{markers}</>;
}

export default function PlannerPage() {
  const advisoryData = useStore((s) => s.advisoryData);
  const pinLocation  = useStore((s) => s.pinLocation);
  const navigate     = useNavigate();

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [calData, setCalData]       = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);

  const wrapperRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart  = useRef({ x: 0, scrollLeft: 0 });

  // Gather context
  const crop  = advisoryData?.crop  || null;
  const state = advisoryData?.state || null;
  const lat   = pinLocation?.lat    || advisoryData?.location?.lat || null;
  const lon   = pinLocation?.lon    || advisoryData?.location?.lon || null;

  // Fetch calendar on mount if we have the data
  useEffect(() => {
    if (!crop || !lat || !lon) return;
    setLoading(true);
    setError(null);
    fetch('/api/crop-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat, lon, crop, state,
        currentDate: new Date().toISOString().split('T')[0],
      }),
    })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setCalData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [crop, lat, lon, state]);

  // Auto-scroll to today marker after data loads
  useEffect(() => {
    if (!calData || !wrapperRef.current) return;
    const days  = daysSince(calData.startDate);
    const todayPx = days * DAY_PX;
    setTimeout(() => {
      wrapperRef.current?.scrollTo({
        left: todayPx - window.innerWidth / 2 + 200,
        behavior: 'smooth',
      });
    }, 400);
  }, [calData]);

  // Drag-to-scroll
  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    dragStart.current = { x: e.pageX, scrollLeft: wrapperRef.current.scrollLeft };
    wrapperRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !wrapperRef.current) return;
    const dx = e.pageX - dragStart.current.x;
    wrapperRef.current.scrollLeft = dragStart.current.scrollLeft - dx * 1.5;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab';
  }, []);

  // Close drawer on click outside
  useEffect(() => {
    if (!activeEvent) return;
    const close = (e) => {
      if (!e.target.closest('.tl-card') && !e.target.closest('.event-drawer')) {
        setActiveEvent(null);
      }
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [activeEvent]);

  // ── Empty state ──
  if (!crop || !lat) {
    return (
      <div className="planner-page planner-empty">
        <div className="planner-empty-inner">
          <div className="planner-empty-icon">🗓</div>
          <h2>Season Planner</h2>
          <p>Run an advisory on the Dashboard first to unlock your personalised 180-day crop calendar.</p>
          <button className="planner-go-btn" onClick={() => navigate('/dashboard')}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="planner-page planner-loading">
        <div className="planner-spinner" />
        <p className="mono">Generating your 180-day {crop} calendar…</p>
        <p className="mono" style={{ opacity: 0.4, fontSize: '0.75rem' }}>
          Analysing NASA climate data + AI agronomics
        </p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="planner-page planner-empty">
        <div className="planner-empty-inner">
          <div className="planner-empty-icon">⚠</div>
          <h2>Couldn't generate calendar</h2>
          <p style={{ color: '#FF4500' }}>{error}</p>
          <button className="planner-go-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!calData) return null;

  const { calendar, summary, startDate } = calData;
  const todayDays   = daysSince(startDate);
  const todayPx     = todayDays * DAY_PX;
  const harvestEv   = calendar.find((e) => e.type === 'harvest');
  const daysToHarvest = harvestEv ? harvestEv.day - todayDays : null;

  const counts = calendar.reduce((acc, e) => {
    acc.total++;
    if (e.urgency === 'critical') acc.critical++;
    if (e.type === 'irrigate')   acc.irrigate++;
    if (e.type === 'harvest')    acc.harvest++;
    return acc;
  }, { total: 0, critical: 0, irrigate: 0, harvest: 0 });

  return (
    <div className="planner-page">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="planner-header">
        <div className="planner-header-left">
          <h1 className="planner-title">Season Planner</h1>
          <div className="planner-badges">
            <span className="planner-badge badge-crop">{crop}</span>
            <span className="planner-badge badge-state">{state}</span>
            {daysToHarvest !== null && daysToHarvest > 0 && (
              <span className="planner-badge badge-harvest mono">
                🌾 Harvest in {daysToHarvest}d
              </span>
            )}
          </div>
          {summary && <p className="planner-summary">{summary}</p>}
        </div>
        <div className="planner-legend">
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <div key={type} className="legend-item">
              <span className="legend-dot" style={{ background: color }} />
              <span className="mono">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TIMELINE ───────────────────────────────── */}
      <div
        className="timeline-wrapper"
        ref={wrapperRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="timeline-track" style={{ width: TRACK_WIDTH }}>

          {/* Axis */}
          <div className="timeline-axis" />

          {/* Month markers */}
          <MonthMarkers startDate={startDate} />

          {/* Today marker */}
          {todayDays <= 180 && (
            <div className="today-marker" style={{ left: todayPx }}>
              <span className="today-label mono">TODAY</span>
            </div>
          )}

          {/* Events */}
          {calendar.map((event, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); setActiveEvent(event); }}
            >
              <TimelineEvent
                event={event}
                position={i % 2 === 0 ? 'above' : 'below'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS BAR ──────────────────────────────── */}
      <div className="planner-stats mono">
        <span>Total events: <strong>{counts.total}</strong></span>
        <span className="stat-sep">·</span>
        <span style={{ color: '#FF4500' }}>Critical: <strong>{counts.critical}</strong></span>
        <span className="stat-sep">·</span>
        {daysToHarvest !== null && <><span style={{ color: '#F59E0B' }}>Harvest in: <strong>{daysToHarvest}d</strong></span><span className="stat-sep">·</span></>}
        <span style={{ color: '#38BDF8' }}>Irrigation events: <strong>{counts.irrigate}</strong></span>
        <span className="stat-sep">·</span>
        <span style={{ opacity: 0.4 }}>⚡ AI-generated from NASA weather data</span>
      </div>

      {/* ── EVENT DETAIL DRAWER ─────────────────────── */}
      <div className={`event-drawer${activeEvent ? ' open' : ''}`}>
        {activeEvent && (
          <>
            <div className="drawer-top">
              <span className="drawer-icon">{activeEvent.icon}</span>
              <div className="drawer-info">
                <div className="drawer-day-badge mono">Day {activeEvent.day} · {activeEvent.date}</div>
                <strong className="drawer-title">{activeEvent.activity}</strong>
              </div>
              <span
                className={`urgency-badge urgency-${activeEvent.urgency}`}
              >
                {activeEvent.urgency}
              </span>
              <button className="drawer-close" onClick={() => setActiveEvent(null)}>✕</button>
            </div>
            <p className="drawer-desc">{activeEvent.description}</p>
            <div
              className="drawer-type-bar"
              style={{ background: TYPE_COLOR[activeEvent.type] || '#fff' }}
            />
          </>
        )}
      </div>

    </div>
  );
}
