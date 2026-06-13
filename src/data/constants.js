// Static reference data for selectors (Section 5).

// Mock supported crops — replace with backend supported-crops endpoint when available.
export const CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Soybean'];

// All Indian states + UTs — needed for the Mandi price API (per backend).
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// Languages for the Last-Mile Accessibility bar (Section 6.2-E).
export const LANGUAGES = [
  { code: 'en', label: 'English', speechLang: 'en-IN' },
  { code: 'hi', label: 'हिन्दी (Hindi)', speechLang: 'hi-IN' },
  { code: 'mr', label: 'मराठी (Marathi)', speechLang: 'mr-IN' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', speechLang: 'pa-IN' },
  { code: 'ta', label: 'தமிழ் (Tamil)', speechLang: 'ta-IN' },
];

// Action-plan `icon` → SVG icon name lives in components/Icon.jsx (ACTION_ICON_NAME).
