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

export default function App() {
  useLenis();

  return (
    <>
      <GlobalNav />
      {/*
        MapLayer lives here — permanently in the DOM, never unmounted.
        Opacity/visibility is driven by the 'revealed' store flag and
        direct style writes from ScrollHeroSection / DashboardPage.
        Removing it from the DOM (conditional render or display:none toggle)
        causes Leaflet's removeChild crash.
      */}
      <MapLayer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/crop-doctor" element={<CropDoctorPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </>
  );
}
