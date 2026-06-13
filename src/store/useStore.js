import { create } from 'zustand';

/**
 * Global app state (Section 7).
 * Kept intentionally small — brutalist "no excess" philosophy.
 */
export const useStore = create((set) => ({
  // --- Map / input ---
  pinLocation: null, // { lat, lon } | null
  selectedCrop: '',
  selectedState: '',

  // --- Advisory result ---
  advisoryData: null,
  isLoading: false,
  error: null,

  // --- UI ---
  dashboardOpen: false,
  selectedLanguage: 'en', // en | hi | mr | pa | ta
  revealed: false, // map revealed after the scroll dive (gates the floating UI)
  diagnoseOpen: false, // leaf-photo diagnosis modal

  // --- Geolocation ---
  geoStatus: 'idle', // idle | locating | granted | denied | unavailable

  // --- Actions ---
  setPinLocation: (loc) => set({ pinLocation: loc }),
  setSelectedCrop: (crop) => set({ selectedCrop: crop }),
  setSelectedState: (state) => set({ selectedState: state }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  setRevealed: (v) => set({ revealed: v }),
  setDiagnoseOpen: (v) => set({ diagnoseOpen: v }),

  // Ask for location; on success drop the pin, else mark denied/unavailable
  // so the UI can prompt the farmer to drop a pin manually.
  requestLocation: () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      set({ geoStatus: 'unavailable' });
      return;
    }
    set({ geoStatus: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        set({
          pinLocation: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          geoStatus: 'granted',
        }),
      (err) => set({ geoStatus: err.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  },

  startLoading: () => set({ isLoading: true, error: null }),
  setAdvisory: (data) =>
    set({ advisoryData: data, isLoading: false, dashboardOpen: true, error: null }),
  setError: (msg) => set({ isLoading: false, error: msg }),

  openDashboard: () => set({ dashboardOpen: true }),
  closeDashboard: () => set({ dashboardOpen: false }),

  reset: () =>
    set({
      advisoryData: null,
      dashboardOpen: false,
      isLoading: false,
      error: null,
    }),
}));
