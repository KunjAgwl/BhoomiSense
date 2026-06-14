import { useLenis } from './hooks/useLenis';
import { useStore } from './store/useStore';
import GlobalNav from './components/GlobalNav';
import MapLayer from './components/MapLayer';
import LandingPage from './pages/LandingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CropDoctorPage from './pages/CropDoctorPage';
import MarketPage from './pages/MarketPage';
import AboutPage from './pages/AboutPage';
import PlannerPage from './pages/PlannerPage';
import YieldPage from './pages/YieldPage';

export default function App() {
  useLenis();
  const activePanel = useStore((s) => s.activePanel);

  return (
    <>
      <GlobalNav />
      <MapLayer />
      
      {/* The main cinematic intro + dashboard always renders at the base level */}
      {/* Its internal UI toggles via the 'revealed' state */}
      <div style={{ display: activePanel === 'dashboard' ? 'block' : 'none' }}>
        <LandingPage />
      </div>

      {/* Other tools overlay on top */}
      {activePanel === 'analytics'   && <AnalyticsPage />}
      {activePanel === 'crop-doctor' && <CropDoctorPage />}
      {activePanel === 'market'      && <MarketPage />}
      {activePanel === 'about'       && <AboutPage />}
      {activePanel === 'planner'     && <PlannerPage />}
      {activePanel === 'yield'       && <YieldPage />}
    </>
  );
}
