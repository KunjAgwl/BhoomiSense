import { useState } from 'react';
import Icon, { ACTION_ICON_NAME } from '../Icon';
import './dashboard.css';

/**
 * B. Actionable Timeline — 3-Day Plan (Section 6.2-B)
 * Vertical checklist; brutalist checkbox (local state only).
 */
export default function ActionTimeline({ plan }) {
  const [checked, setChecked] = useState({});
  if (!plan || plan.length === 0) return null;

  const toggle = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="timeline">
      <h3 className="intel-section__title">
        <Icon name="harvest" size={18} />
        3-Day Action Plan
      </h3>
      <ol className="timeline__list">
        {plan.map((item, i) => {
          const iconName = ACTION_ICON_NAME[item.icon] || ACTION_ICON_NAME.default;
          const isDone = !!checked[i];
          return (
            <li key={i} className={`timeline__card ${isDone ? 'is-done' : ''}`}>
              <button
                className={`timeline__check ${isDone ? 'is-checked' : ''}`}
                onClick={() => toggle(i)}
                aria-pressed={isDone}
                aria-label={`Mark "${item.action}" ${isDone ? 'incomplete' : 'done'}`}
              >
                {isDone && <Icon name="check" size={16} strokeWidth={3} />}
              </button>
              <div className="timeline__body">
                <div className="timeline__top">
                  <span className="timeline__day mono">{item.day}</span>
                  <span className="timeline__glyph" aria-hidden="true">
                    <Icon name={iconName} size={20} />
                  </span>
                </div>
                <p className="timeline__action">{item.action}</p>
                <p className="timeline__detail">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
