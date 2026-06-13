import Icon from '../Icon';
import './dashboard.css';

/**
 * D. Raw Data Chips (Section 6.2-D)
 * Pill-shaped frosted chips. Moisture chip flashes red + bolds if < 20%.
 */
export default function DataChips({ environment }) {
  if (!environment) return null;

  const moisture = environment.root_zone_moisture_pct;
  const lowMoisture = moisture < 20;

  return (
    <div className="chips">
      <h3 className="intel-section__title">
        <Icon name="layers" size={18} />
        Live Readings
      </h3>
      <div className="chips__row">
        <div className={`chip ${lowMoisture ? 'chip--flash' : ''}`}>
          <span className="chip__icon"><Icon name="droplet" size={18} /></span>
          <span className="chip__label">Root Zone Moisture</span>
          <span className={`chip__value mono ${lowMoisture ? 'is-low' : ''}`}>{moisture}%</span>
        </div>

        <div className="chip">
          <span className="chip__icon"><Icon name="cloud-rain" size={18} /></span>
          <span className="chip__label">7-Day Rain</span>
          <span className="chip__value mono">{environment.rain_forecast_7day_mm}mm</span>
        </div>

        <div className="chip">
          <span className="chip__icon"><Icon name="thermometer" size={18} /></span>
          <span className="chip__label">Current Temp</span>
          <span className="chip__value mono">{environment.current_temp_c}°C</span>
        </div>
      </div>
    </div>
  );
}
