import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import ActionPanel from '../components/ActionPanel';
import IntelligenceDashboard from '../components/IntelligenceDashboard';
import DiagnosisPanel from '../components/DiagnosisPanel';
import './DashboardPage.css';

export default function DashboardPage() {
  const requestLocation   = useStore((s) => s.requestLocation);
  const geoStatus         = useStore((s) => s.geoStatus);
  const setRevealed       = useStore((s) => s.setRevealed);
  const advisoryPanelOpen = useStore((s) => s.advisoryPanelOpen);

  useEffect(() => {
    setRevealed(true);
    const mapEl = document.querySelector('.map-layer');
    if (mapEl) {
      mapEl.style.opacity = '1';
      mapEl.style.transform = 'scale(1)';
    }
    if (geoStatus === 'idle') requestLocation();
  }, [setRevealed, geoStatus, requestLocation]);

  return (
    <div className={`dashboard-shell${advisoryPanelOpen ? ' panel-open' : ''}`}>
      {/* LEFT: advisory panel — CSS transform drives it in/out */}
      <IntelligenceDashboard />

      {/* Command pod + other floating UI float over the map */}
      <div className="app-ui app-ui--revealed">
        <ActionPanel />
        <DiagnosisPanel />
      </div>
    </div>
  );
}
