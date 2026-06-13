/**
 * Synthetic leaf-diagnosis results — mirrors the backend `/api/diagnose-image`
 * response shape: { diseaseName, confidence, severity, cause, treatment,
 * prevention, urgency }. Runs entirely on synthetic data (no API / no keys).
 */

const SAMPLES = [
  {
    diseaseName: 'Leaf Rust',
    confidence: 'HIGH',
    severity: 'MODERATE',
    cause: 'Fungal (Puccinia triticina), favored by high humidity and dew.',
    treatment:
      'Spray Propiconazole 25 EC @ 0.1% (1 ml/litre). Repeat after 15 days if spots persist.',
    prevention: 'Use rust-resistant varieties; avoid late-evening irrigation that keeps leaves wet.',
    urgency: 'WITHIN_3_DAYS',
  },
  {
    diseaseName: 'Bacterial Leaf Blight',
    confidence: 'MEDIUM',
    severity: 'SEVERE',
    cause: 'Bacterial (Xanthomonas oryzae), spread by standing water and wind-driven rain.',
    treatment:
      'Drain excess field water. Spray Copper Oxychloride @ 3 g/litre + Streptocycline @ 0.5 g/10 litre.',
    prevention: 'Avoid excess nitrogen; maintain field drainage; treat seed before sowing.',
    urgency: 'IMMEDIATE',
  },
  {
    diseaseName: 'Healthy',
    confidence: 'HIGH',
    severity: 'NONE',
    cause: 'No disease detected. Leaf colour and texture are within healthy range.',
    treatment: 'No treatment needed. Continue your current crop-care routine.',
    prevention: 'Keep monitoring weekly and maintain balanced nutrition.',
    urgency: 'MONITOR',
  },
  {
    diseaseName: 'Nitrogen Deficiency',
    confidence: 'MEDIUM',
    severity: 'MILD',
    cause: 'Nutrient deficiency — older leaves yellowing from the tip inward (chlorosis).',
    treatment: 'Apply Urea top-dressing @ 25 kg/acre, or foliar spray of 2% Urea solution.',
    prevention: 'Split nitrogen application across growth stages; test soil before each season.',
    urgency: 'WITHIN_3_DAYS',
  },
];

/** Pick a synthetic diagnosis (varies per call so the demo feels alive). */
export function buildMockDiagnosis() {
  const pick = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  return { ...pick };
}
