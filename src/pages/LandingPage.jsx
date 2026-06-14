import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import ScrollHeroSection from '../components/ScrollHeroSection';
import ActionPanel from '../components/ActionPanel';
import IntelligenceDashboard from '../components/IntelligenceDashboard';
import DiagnosisPanel from '../components/DiagnosisPanel';
import './LandingPage.css';
import './DashboardPage.css'; // inherit dashboard styles

export default function LandingPage() {
  const requestLocation   = useStore((s) => s.requestLocation);
  const geoStatus         = useStore((s) => s.geoStatus);
  const revealed          = useStore((s) => s.revealed);
  const advisoryPanelOpen = useStore((s) => s.advisoryPanelOpen);

  useEffect(() => {
    // Request location INSTANTLY on page load, don't wait for scroll
    if (geoStatus === 'idle') {
      requestLocation();
    }
  }, [geoStatus, requestLocation]);

  return (
    <>
      <ScrollHeroSection />
      
      <div className={`dashboard-shell ${advisoryPanelOpen ? ' panel-open' : ''}`}>
        {/* LEFT: advisory panel — CSS transform drives it in/out */}
        <IntelligenceDashboard />

        {/* Command pod + other floating UI float over the map */}
        <div className={`app-ui ${revealed ? 'app-ui--revealed' : ''}`}>
          <ActionPanel />
          <DiagnosisPanel />
        </div>
      </div>
    </>
  );
}
