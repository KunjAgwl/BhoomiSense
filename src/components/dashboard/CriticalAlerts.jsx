import Icon from '../Icon';
import './dashboard.css';

/**
 * A. Critical Alerts Banner (Section 6.2-A)
 * High severity = danger bg + pulse; medium = warning bg.
 */
const TYPE_ICON = {
  pest_disease: 'bug',
  weather: 'cloud-rain',
  disease: 'bug',
  default: 'alert',
};

export default function CriticalAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="alerts">
      {alerts.map((alert, i) => (
        <div key={i} className={`alert alert--${alert.severity}`} role="alert">
          <span className="alert__icon" aria-hidden="true">
            <Icon name={TYPE_ICON[alert.type] || TYPE_ICON.default} size={22} strokeWidth={2} />
          </span>
          <div className="alert__content">
            <span className="alert__type mono">
              {alert.type?.replace(/_/g, ' ').toUpperCase()}
            </span>
            <p className="alert__message">{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
