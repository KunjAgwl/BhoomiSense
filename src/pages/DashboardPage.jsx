import { useStore } from '../store/useStore';
import ActionPanel from '../components/ActionPanel';
import IntelligenceDashboard from '../components/IntelligenceDashboard';
import DiagnosisPanel from '../components/DiagnosisPanel';
import { useEffect } from 'react';

export default function DashboardPage() {
  const requestLocation    = useStore((s) => s.requestLocation);
  const geoStatus          = useStore((s) => s.geoStatus);
  const setRevealed        = useStore((s) => s.setRevealed);
  const advisoryPanelOpen  = useStore((s) => s.advisoryPanelOpen);

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
    // app-ui--split shifts the command pod to the right half when the advisory panel is open
    <div className={`app-ui app-ui--revealed${advisoryPanelOpen ? ' app-ui--split' : ''}`}>
      <ActionPanel />
      <IntelligenceDashboard />
      <DiagnosisPanel />
    </div>
  );
}
