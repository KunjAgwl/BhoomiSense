import { useLenis } from './hooks/useLenis';
import { Routes, Route } from 'react-router-dom';
import GlobalNav from './components/GlobalNav';
import MapLayer from './components/MapLayer';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CropDoctorPage from './pages/CropDoctorPage';
import MarketPage from './pages/MarketPage';
import AboutPage from './pages/AboutPage';
import PlannerPage from './pages/PlannerPage';
import YieldPage from './pages/YieldPage';

export default function App() {
  useLenis();

  return (
    <>
      <GlobalNav />
      <MapLayer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/crop-doctor" element={<CropDoctorPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/yield" element={<YieldPage />} />
      </Routes>
    </>
  );
}
