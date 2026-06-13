import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import Icon from '../Icon';
import './dashboard.css';

/**
 * C. Economic & Resource Tracker (Section 6.2-C)
 * Resource Savings + Mandi Price (minimal sparkline).
 */
export default function ResourceTracker({ savings, mandi }) {
  const rising = mandi?.trend === 'rising';
  const sparkData = (mandi?.history_7day || []).map((v, i) => ({ i, v }));

  return (
    <div className="tracker">
      <h3 className="intel-section__title">
        <Icon name="trending-up" size={18} />
        Economics &amp; Savings
      </h3>
      <div className="tracker__grid">
        {/* Resource Savings */}
        <div className="tracker__card liquid">
          <span className="tracker__card-label mono">SAVED TODAY</span>
          <div className="tracker__savings">
            <div className="tracker__stat">
              <span className="tracker__stat-head">
                <Icon name="droplet" size={15} />
                <span className="tracker__sub">Water saved today</span>
              </span>
              <span className="tracker__big">
                {savings ? savings.water_liters.toLocaleString('en-IN') : '0'}
                <span className="tracker__unit"> L</span>
              </span>
            </div>
            <div className="tracker__stat">
              <span className="tracker__stat-head">
                <Icon name="sun" size={15} />
                <span className="tracker__sub">Electricity saved</span>
              </span>
              <span className="tracker__big">
                ₹{savings ? savings.electricity_inr.toLocaleString('en-IN') : '0'}
              </span>
            </div>
            {savings?.fertilizer_inr_saved != null && (
              <div className="tracker__stat">
                <span className="tracker__stat-head">
                  <Icon name="flask" size={15} />
                  <span className="tracker__sub">Fertilizer saved</span>
                </span>
                <span className="tracker__big">
                  ₹{savings.fertilizer_inr_saved.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mandi Price */}
        <div className="tracker__card liquid">
          <span className="tracker__card-label mono">MANDI PRICE</span>
          <span className="tracker__crop">{mandi?.crop}</span>
          <div className="tracker__price-row">
            <span className="tracker__price">
              ₹{mandi ? mandi.current.toLocaleString('en-IN') : '—'}
            </span>
            <span className={`tracker__trend ${rising ? 'is-up' : 'is-down'}`}>
              <Icon name={rising ? 'trending-up' : 'trending-down'} size={20} strokeWidth={2.2} />
            </span>
          </div>
          <span className="tracker__price-unit mono">{mandi?.unit}</span>

          <div className="tracker__spark">
            <ResponsiveContainer width="100%" height={46}>
              <LineChart data={sparkData} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
