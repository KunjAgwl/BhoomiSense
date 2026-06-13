# Bhoomi Sense — Full Stack

Scroll-driven cinematic ("Soil → Satellite") that **dives into a live satellite
map**, with a neo-brutalist × **liquid-glass** precision-agriculture dashboard
floating over the imagery.

Frontend: React + Vite, react-leaflet (Esri satellite tiles), GSAP + ScrollTrigger,
Lenis, zustand, recharts.
Backend (from `KunjAgwl/BhoomiSense`): Express + OpenAI + NASA POWER + CEDA Agmarknet
+ Sentinel-2 NDVI.

## Layout

```
BhoomiSense/
  src/ … index.html … vite.config.js   # frontend (lives at repo root)
  backend/                             # combined-in Express API
    src/server.js                      # POST /api/advisory, /api/diagnose-image
    src/utils/{nasaApi,cedaApi,ndviApi}.js
    .env.example
  public/zoom/                         # drop the real animated frames here
```

## Run

Frontend:
```bash
npm install
npm run dev            # http://localhost:5173
```

Backend (optional — only needed for live data):
```bash
cd backend
npm install
cp .env.example .env   # add OPENAI_API_KEY, OPENAI_BASE_URL, AI_MODEL, AGRIAPI
npm run dev            # http://localhost:5000
```

Then in `src/api/advisory.js` set `USE_REAL_BACKEND = true` (defaults to the
mock so the UI is demo-able with no keys).

## The cinematic (src/components/ScrollHeroSection.jsx)

One pinned 700vh section, one scrubbed driver, three phases:

| Phase | Progress | What happens |
|-------|----------|--------------|
| **Sequence** | 0 → 0.58 | 5 real frames (`public/images/bhoomi1–5.png`), eased (smootherstep) crossfade + continuous parallax zoom |
| **Hold** | 0.58 → 0.72 | satellite frame locks in place, orbit HUD settles |
| **Reveal** | 0.72 → 1.00 | "dive" through the satellite frame (scale-in) → the **live Esri satellite map** is revealed underneath and settles in |

Smoothness = Lenis inertia + ScrollTrigger `scrub: 1` + smootherstep easing + the
map reveal driven by **direct DOM writes** (no React re-renders mid-scroll). The
hero is fully transparent + `pointer-events:none` and `visibility:hidden` once
dived, so the map fills the viewport and stays clickable (no black overlay), and
the glass panels stay out of the paint path during the cinematic (no jitter).

**Swapping the frames:** the 5 stages live in the `STAGES` array in
`ScrollHeroSection.jsx` (`/images/bhoomi1–5.png`). Drop a real animated sequence
(more frames or a video) there — the phase math is asset-agnostic.

## Other features

- **Geolocation:** on reveal the app asks for the farmer's location and drops the
  pin automatically; if denied/unavailable it falls back to manual map-click
  (with a "Use my location" retry button).
- **Leaf Scan (AI Crop Doctor):** "Scan a leaf" opens a photo-upload modal that
  returns a synthetic diagnosis (disease, severity, cause, treatment, prevention,
  urgency) — runs entirely on synthetic data, no API/keys.
- **Read Aloud:** if the device has no hi/mr/pa/ta TTS voice (common on Windows),
  it reads the English advisory intelligibly and shows a note, instead of
  garbling the regional script.

## Backend integration (src/api/advisory.js)

The real backend returns `{ data: { satellite, weather, market, advisory } }` —
a totally different shape than the original spec. `adaptBackendResponse()` maps it
into the UI shape. Things it synthesizes / infers (flag to the backend dev):

- `advisory.alerts` are plain strings → severity/type **inferred**.
- today/tomorrow/day3 strings → action-plan **icons inferred**.
- `resourceSaving` is free text → numbers **parsed** best-effort.
- no mandi history/trend → sparkline + trend **synthesized**.
- satellite gives point NDVI samples, not a grid → grid **synthesized**.
- no translations block → language switch **falls back to English**.

## ⚠ Open items

- Backend auth/deploy URL (currently `http://localhost:5000`).
- Confirm the synthesized fields above vs. what the backend can actually provide
  (mandi history, NDVI grid, translations) so we stop synthesizing them.
- Real "Soil → Satellite" animated sequence (you're providing this).
- Indian-language TTS varies by browser/OS; falls back to `en-IN` with a warning.
- Note: the local browser-preview screenshot tool can't composite Leaflet's
  transformed tile panes + `backdrop-filter`, so the satellite-map view captures
  black there — it renders correctly in a normal browser (tiles verified loaded).
