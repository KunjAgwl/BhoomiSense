import { useStore } from '../store/useStore';
import CriticalAlerts from './dashboard/CriticalAlerts';
import ActionTimeline from './dashboard/ActionTimeline';
import ResourceTracker from './dashboard/ResourceTracker';
import DataChips from './dashboard/DataChips';
import AccessibilityBar from './dashboard/AccessibilityBar';
import Icon from './Icon';
import './IntelligenceDashboard.css';

/**
 * Intelligence Dashboard (Section 6) — slides in from the right on a successful
 * advisory response. Houses sub-components A–E. Full-screen overlay on mobile.
 */
export default function IntelligenceDashboard() {
  const advisoryData = useStore((s) => s.advisoryData);
  const dashboardOpen = useStore((s) => s.dashboardOpen);
  const selectedLanguage = useStore((s) => s.selectedLanguage);
  const closeDashboard = useStore((s) => s.closeDashboard);

  const open = dashboardOpen && advisoryData;
  const isEnglish = selectedLanguage === 'en';
  const translation = !isEnglish ? advisoryData?.translations?.[selectedLanguage] : null;

  return (
    <section
      className={`intel-dash ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
    >
      <header className="intel-dash__header">
        <div>
          <span className="intel-dash__kicker mono">FIELD INTELLIGENCE</span>
          <h2 className="intel-dash__title">ADVISORY</h2>
          {advisoryData && (
            <p className="intel-dash__meta mono">
              {advisoryData.crop} · {advisoryData.state}
            </p>
          )}
        </div>
        <button
          className="intel-dash__close"
          onClick={closeDashboard}
          aria-label="Close advisory"
        >
          <Icon name="close" size={18} strokeWidth={2.2} />
        </button>
      </header>

      <div className="intel-dash__scroll">
        {advisoryData && (
          <>
            {/* Non-English: show translated summary banner as placeholder text (Section 6.2-E) */}
            {translation?.summary && (
              <div className="intel-dash__translation liquid">
                <span className="intel-dash__translation-tag mono">
                  {selectedLanguage.toUpperCase()} · SUMMARY
                </span>
                <p>{translation.summary}</p>
              </div>
            )}

            {/* A */}
            <CriticalAlerts alerts={advisoryData.critical_alerts} />
            {/* B */}
            <ActionTimeline plan={advisoryData.action_plan} />
            {/* C */}
            <ResourceTracker
              savings={advisoryData.resource_savings}
              mandi={advisoryData.mandi_price}
            />
            {/* D */}
            <DataChips environment={advisoryData.environment} />
          </>
        )}
      </div>

      {/* E — sticky bottom bar */}
      {advisoryData && <AccessibilityBar advisory={advisoryData} />}
    </section>
  );
}
