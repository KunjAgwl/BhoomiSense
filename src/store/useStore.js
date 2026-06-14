import { create } from 'zustand';

export const useStore = create((set) => ({
  // --- Map / input ---
  pinLocation: null,
  fieldPolygon: null,
  selectedCrop: '',
  selectedState: '',

  // --- Advisory result ---
  advisoryData: null,
  isLoading: false,
  error: null,

  // --- UI ---
  dashboardOpen: false,
  advisoryPanelOpen: false,   // ← drives the 50/50 split
  selectedLanguage: 'en',
  revealed: false,
  diagnoseOpen: false,

  // --- Geolocation ---
  geoStatus: 'idle',

  // --- Actions ---
  setPinLocation: (loc) => set({ pinLocation: loc }),
  setFieldPolygon: (poly) => set({ fieldPolygon: poly }),
  setSelectedCrop: (crop) => set({ selectedCrop: crop }),
  setSelectedState: (state) => set({ selectedState: state }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  setRevealed: (v) => set({ revealed: v }),
  setDiagnoseOpen: (v) => set({ diagnoseOpen: v }),

  requestLocation: () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      set({ geoStatus: 'unavailable' });
      return;
    }
    set({ geoStatus: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => set({
        pinLocation: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        geoStatus: 'granted',
      }),
      (err) => set({ geoStatus: err.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  },

  startLoading: () => set({ isLoading: true, error: null }),
  setAdvisory: (data) =>
    set({ advisoryData: data, isLoading: false, dashboardOpen: true, advisoryPanelOpen: true, error: null }),
  setError: (msg) => set({ isLoading: false, error: msg }),

  openDashboard: () => set({ dashboardOpen: true, advisoryPanelOpen: true }),
  closeDashboard: () => set({ dashboardOpen: false, advisoryPanelOpen: false }),

  reset: () => set({
    advisoryData: null,
    dashboardOpen: false,
    advisoryPanelOpen: false,
    isLoading: false,
    error: null,
  }),
}));
