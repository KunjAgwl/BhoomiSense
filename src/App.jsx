import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { useLenis } from './hooks/useLenis';
import ScrollHeroSection from './components/ScrollHeroSection';
import MapLayer from './components/MapLayer';
import ActionPanel from './components/ActionPanel';
import IntelligenceDashboard from './components/IntelligenceDashboard';
import DiagnosisPanel from './components/DiagnosisPanel';

/**
 * Single-page app.
 *   <MapLayer />            fixed full-screen LIVE satellite map (revealed by dive)
 *   <ScrollHeroSection />   tall pinned cinematic, transparent → exposes the map
 *   app-ui                  liquid-glass UI, fades in once `revealed`
 */
export default function App() {
  useLenis();
  const revealed = useStore((s) => s.revealed);
  const geoStatus = useStore((s) => s.geoStatus);
  const requestLocation = useStore((s) => s.requestLocation);

  // Once the map is revealed, ask for the farmer's location automatically.
  // If denied/unavailable, the UI falls back to manual pin-drop.
  useEffect(() => {
    if (revealed && geoStatus === 'idle') requestLocation();
  }, [revealed, geoStatus, requestLocation]);

  return (
    <>
      <MapLayer />
      <ScrollHeroSection />
      <div className={`app-ui ${revealed ? 'app-ui--revealed' : ''}`}>
        <ActionPanel />
        <IntelligenceDashboard />
        <DiagnosisPanel />
      </div>
    </>
  );
}
