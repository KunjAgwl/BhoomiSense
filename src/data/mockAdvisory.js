/**
 * Mock advisory payload — mirrors the backend response shape in Section 6.1.
 *
 * NOTE ON ndvi_grid.values: the spec shows it as a *stringified* array
 * (`"[[0.6,0.65,...]]"`). We generate a real numeric 2D array here so the map
 * overlay (Section 4) can render cells directly. The fetch layer
 * (`api/advisory.js`) normalizes either form via `parseNdviValues()`, so a real
 * backend sending the stringified form will still work without UI changes.
 */

// Build an N x N grid of NDVI values (0..1) with a smooth radial-ish gradient
// plus a deliberately deficient patch in the NE quadrant (matches the
// "localized deficiency" narrative in the action plan).
function buildNdviGrid(size = 12) {
  const values = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      // Healthy base, vegetation strongest toward the centre.
      const dx = (c - size / 2) / size;
      const dy = (r - size / 2) / size;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let v = 0.78 - dist * 0.45;

      // NE deficiency patch (top-right corner): rows 0-3, cols 8-11.
      if (r < 4 && c > size - 5) v -= 0.32;

      // A little organic noise.
      v += (Math.sin(r * 1.7) + Math.cos(c * 2.1)) * 0.02;

      row.push(Math.max(0.05, Math.min(0.92, Number(v.toFixed(2)))));
    }
    values.push(row);
  }
  return values;
}

export function buildMockAdvisory({ lat = 28.6139, lon = 77.209, crop = 'Wheat', state = 'Punjab' } = {}) {
  const grid = buildNdviGrid(12);

  return {
    location: { lat, lon },
    crop,
    state,
    critical_alerts: [
      {
        severity: 'high',
        type: 'pest_disease',
        message: 'High humidity: 85% risk of fungal blight. Inspect crops immediately.',
      },
      {
        severity: 'medium',
        type: 'weather',
        message: 'Heavy rainfall (40mm) expected in 48 hours.',
      },
    ],
    action_plan: [
      {
        day: 'Today',
        icon: 'no-water',
        action: 'Do not irrigate',
        detail: 'Soil moisture is sufficient at 35%.',
      },
      {
        day: 'Tomorrow',
        icon: 'fertilizer',
        action: 'Apply Nitrogen fertilizer to North-East quadrant',
        detail: 'Satellite shows localized deficiency.',
      },
      {
        day: 'Day 3',
        icon: 'harvest',
        action: 'Prepare for harvest',
        detail: 'Mandi prices peaking.',
      },
    ],
    resource_savings: {
      water_liters: 5000,
      electricity_inr: 150,
      fertilizer_inr_saved: 500,
    },
    mandi_price: {
      crop,
      unit: 'per quintal',
      current: 2150,
      trend: 'rising',
      history_7day: [2080, 2095, 2100, 2110, 2130, 2140, 2150],
    },
    environment: {
      root_zone_moisture_pct: 35,
      rain_forecast_7day_mm: 12,
      current_temp_c: 28,
    },
    ndvi_grid: {
      bounds: {
        lat_min: lat - 0.004,
        lat_max: lat + 0.004,
        lon_min: lon - 0.004,
        lon_max: lon + 0.004,
      },
      resolution: 10,
      values: grid, // real 2D numeric array (see file header note)
    },
    translations: {
      hi: {
        summary:
          'आज सिंचाई न करें — मिट्टी में पर्याप्त नमी (35%) है। कल उत्तर-पूर्व हिस्से में नाइट्रोजन उर्वरक डालें। तीसरे दिन कटाई की तैयारी करें, मंडी भाव ऊँचे हैं। फफूंद रोग का खतरा अधिक है — फसल का तुरंत निरीक्षण करें।',
        action_plan_audio_text:
          'चेतावनी: अधिक नमी के कारण फफूंद रोग का पचासी प्रतिशत खतरा है, फसल का तुरंत निरीक्षण करें। आज सिंचाई न करें क्योंकि मिट्टी में पैंतीस प्रतिशत नमी है। कल उत्तर-पूर्व हिस्से में नाइट्रोजन उर्वरक डालें। तीसरे दिन कटाई की तैयारी करें।',
      },
      mr: {
        summary:
          'आज पाणी देऊ नका — जमिनीत पुरेसा ओलावा (35%) आहे. उद्या ईशान्य भागात नायट्रोजन खत द्या. तिसऱ्या दिवशी कापणीची तयारी करा, बाजारभाव वाढत आहेत. बुरशीजन्य रोगाचा धोका जास्त आहे — पिकाची त्वरित तपासणी करा.',
        action_plan_audio_text:
          'सूचना: जास्त आर्द्रतेमुळे बुरशीजन्य रोगाचा पंच्याऐंशी टक्के धोका आहे, पिकाची त्वरित तपासणी करा. आज पाणी देऊ नका कारण जमिनीत पस्तीस टक्के ओलावा आहे. उद्या ईशान्य भागात नायट्रोजन खत द्या. तिसऱ्या दिवशी कापणीची तयारी करा.',
      },
      pa: {
        summary:
          'ਅੱਜ ਸਿੰਚਾਈ ਨਾ ਕਰੋ — ਮਿੱਟੀ ਵਿੱਚ ਕਾਫ਼ੀ ਨਮੀ (35%) ਹੈ। ਕੱਲ੍ਹ ਉੱਤਰ-ਪੂਰਬੀ ਹਿੱਸੇ ਵਿੱਚ ਨਾਈਟ੍ਰੋਜਨ ਖਾਦ ਪਾਓ। ਤੀਜੇ ਦਿਨ ਵਾਢੀ ਦੀ ਤਿਆਰੀ ਕਰੋ, ਮੰਡੀ ਭਾਅ ਉੱਚੇ ਹਨ। ਫ਼ਫ਼ੂੰਦੀ ਰੋਗ ਦਾ ਖ਼ਤਰਾ ਜ਼ਿਆਦਾ ਹੈ — ਫ਼ਸਲ ਦੀ ਤੁਰੰਤ ਜਾਂਚ ਕਰੋ।',
        action_plan_audio_text:
          'ਚੇਤਾਵਨੀ: ਜ਼ਿਆਦਾ ਨਮੀ ਕਾਰਨ ਫ਼ਫ਼ੂੰਦੀ ਰੋਗ ਦਾ ਪਚਾਸੀ ਫ਼ੀਸਦੀ ਖ਼ਤਰਾ ਹੈ, ਫ਼ਸਲ ਦੀ ਤੁਰੰਤ ਜਾਂਚ ਕਰੋ। ਅੱਜ ਸਿੰਚਾਈ ਨਾ ਕਰੋ ਕਿਉਂਕਿ ਮਿੱਟੀ ਵਿੱਚ ਪੈਂਤੀ ਫ਼ੀਸਦੀ ਨਮੀ ਹੈ। ਕੱਲ੍ਹ ਉੱਤਰ-ਪੂਰਬੀ ਹਿੱਸੇ ਵਿੱਚ ਨਾਈਟ੍ਰੋਜਨ ਖਾਦ ਪਾਓ। ਤੀਜੇ ਦਿਨ ਵਾਢੀ ਦੀ ਤਿਆਰੀ ਕਰੋ।',
      },
      ta: {
        summary:
          'இன்று பாசனம் செய்ய வேண்டாம் — மண்ணில் போதுமான ஈரப்பதம் (35%) உள்ளது. நாளை வடகிழக்குப் பகுதியில் நைட்ரஜன் உரம் இடவும். மூன்றாம் நாள் அறுவடைக்குத் தயாராகுங்கள், சந்தை விலை உயர்ந்துள்ளது. பூஞ்சை நோய் அபாயம் அதிகம் — பயிரை உடனே பரிசோதிக்கவும்.',
        action_plan_audio_text:
          'எச்சரிக்கை: அதிக ஈரப்பதத்தால் பூஞ்சை நோய்க்கு எண்பத்தைந்து சதவீத அபாயம் உள்ளது, பயிரை உடனே பரிசோதிக்கவும். இன்று பாசனம் செய்ய வேண்டாம், ஏனெனில் மண்ணில் முப்பத்தைந்து சதவீத ஈரப்பதம் உள்ளது. நாளை வடகிழக்குப் பகுதியில் நைட்ரஜன் உரம் இடவும். மூன்றாம் நாள் அறுவடைக்குத் தயாராகுங்கள்.',
      },
    },
  };
}
