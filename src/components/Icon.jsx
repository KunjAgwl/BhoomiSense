/**
 * Icon — single inline-SVG icon set (replaces emojis across the app).
 * Stroke-based, inherits `currentColor`, rounded joins for a refined look.
 *
 * Usage: <Icon name="droplet" size={20} />
 */

const PATHS = {
  // --- water / irrigation ---
  droplet: (
    <path d="M12 3.2c3.2 3.6 5.5 6.4 5.5 9.3a5.5 5.5 0 0 1-11 0c0-2.9 2.3-5.7 5.5-9.3Z" />
  ),
  'droplet-off': (
    <>
      <path d="M12 3.2c3.2 3.6 5.5 6.4 5.5 9.3a5.5 5.5 0 0 1-9.4 3.9" />
      <path d="M6.6 9.6a8 8 0 0 0-.1 2.9 5.5 5.5 0 0 0 1.2 2.9" />
      <path d="M4 4l16 16" />
    </>
  ),
  // --- fertilizer / lab ---
  flask: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6.2L5.3 17a2 2 0 0 0 1.7 3h10a2 2 0 0 0 1.7-3L14 9.2V3" />
      <path d="M7.5 14h9" />
    </>
  ),
  // --- harvest ---
  harvest: (
    <>
      <path d="M12 21V8" />
      <path d="M12 8c0-2.5-1.6-4.4-4-5 0 2.6 1.4 4.6 4 5Z" />
      <path d="M12 10c0-2.5 1.6-4.4 4-5 0 2.6-1.4 4.6-4 5Z" />
      <path d="M7 21h10" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20v-7" />
      <path d="M12 13c0-2.8-2-4.8-5-5 0 2.9 2 4.8 5 5Z" />
      <path d="M12 11c0-2.4 1.8-4.2 4.5-4.4 0 2.5-1.8 4.2-4.5 4.4Z" />
    </>
  ),
  // --- weather ---
  'cloud-rain': (
    <>
      <path d="M7 16a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 7.5a3.5 3.5 0 0 1 1 6.8" />
      <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
    </>
  ),
  thermometer: (
    <>
      <path d="M12 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" />
      <path d="M10 14.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill="currentColor" stroke="none" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  // --- pest / alert ---
  bug: (
    <>
      <path d="M9 8a3 3 0 0 1 6 0" />
      <rect x="7" y="8" width="10" height="9" rx="5" />
      <path d="M3 13h4M17 13h4M5 8l2 2M19 8l-2 2M5 18l2-2M19 18l-2-2M12 17v3" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.7 19.2A1 1 0 0 0 3.6 20.7h16.8a1 1 0 0 0 .9-1.5L12 4Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16Z" />
      <path d="M5.5 18.5C9 15 13 11 18 6.5" />
    </>
  ),
  // --- map / target ---
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  satellite: (
    <>
      <path d="M5 13l-2 2 4 4 2-2" />
      <path d="M9 9 6 6l3-3 3 3" />
      <path d="m9 9 6 6" />
      <path d="m15 15 3 3-3 3-3-3" />
      <path d="M19 5a4 4 0 0 1 0 6M16.5 7.5a1.5 1.5 0 0 1 0 1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </>
  ),
  // --- controls ---
  play: <path d="M7 5v14l12-7L7 5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9v6h3l5 4V5L7 9H4Z" />
      <path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12" />
    </>
  ),
  check: <path d="M4 12.5 9 17.5 20 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-down': <path d="M5 9l7 7 7-7" />,
  'trending-up': (
    <>
      <path d="M3 17 10 10l3.5 3.5L21 6" />
      <path d="M21 11V6h-5" />
    </>
  ),
  'trending-down': (
    <>
      <path d="M3 7l7 7 3.5-3.5L21 18" />
      <path d="M21 13v5h-5" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h8a2 2 0 1 1-2 2" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  navigation: <path d="M3 11 21 3l-8 18-2-7-8-3Z" />,
  camera: (
    <>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="M7.5 9.5 12 5l4.5 4.5" />
      <path d="M5 19h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-1.7 6" />
      <path d="M20 4v6h-6" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" />
    </>
  ),
};

export default function Icon({ name, size = 22, strokeWidth = 1.75, className = '', style }) {
  const path = PATHS[name];
  if (!path) {
    console.warn(`[Icon] Unknown icon "${name}"`);
    return null;
  }
  return (
    <svg
      className={`icon icon--${name} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {path}
    </svg>
  );
}

// Map advisory action `icon` field → icon name (replaces emoji map).
export const ACTION_ICON_NAME = {
  'no-water': 'droplet-off',
  water: 'droplet',
  fertilizer: 'flask',
  harvest: 'harvest',
  spray: 'wind',
  inspect: 'crosshair',
  seed: 'sprout',
  pest: 'bug',
  default: 'leaf',
};
