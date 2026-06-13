const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');
const { fetchNASAData } = require('./utils/nasaApi');
const { fetchMandiPrice } = require('./utils/cedaApi');
const { fetchNDVIData } = require('./utils/ndviApi');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize OpenAI Compatible Client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
});
const AI_MODEL = process.env.AI_MODEL || "gpt-3.5-turbo";

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', message: 'Bhoomi Sense API is running' });
});

app.post('/api/advisory', async (req, res) => {
    try {
        const { lat, lon, commodity, state } = req.body;

        if (!lat || !lon || !commodity || !state) {
            return res.status(400).json({ error: "Missing required parameters (lat, lon, commodity, state)" });
        }

        console.log(`[Bhoomi Sense] Fetching data for ${commodity} in ${state} at ${lat}, ${lon}...`);

        // 1. Fetch live weather and soil data from NASA
        const weatherData = await fetchNASAData(lat, lon);
        
        // 2. Fetch live mandi prices from CEDA
        const marketData = await fetchMandiPrice(commodity, state);

        // 3. Fetch Sentinel-2 Satellite NDVI data (AWS Open Data)
        // Passing real NASA weather data to make our localized estimates biologically accurate
        const satelliteData = await fetchNDVIData(lat, lon, weatherData);

        // 4. Construct the prompt with ALL fused data
        const prompt = `
        You are 'Bhoomi Sense', an expert AI agronomist for Indian smallholder farmers.
        Based on the following real-time data, generate a structured advisory.
        Speak directly to the farmer in plain, simple language. No jargon.

        FARM LOCATION: ${state} (Lat: ${lat}, Lon: ${lon})
        CROP: ${commodity}

        SATELLITE CROP HEALTH (Sentinel-2, 10m resolution):
        - Overall Field Health: ${satelliteData.fieldHealth}
        - Center NDVI: ${satelliteData.ndviCenter} (Scale 0-1, <0.3 is dead, >0.6 is healthy)
        - Field Average NDVI: ${satelliteData.ndviAverage}
        - Multi-Point Samples: ${satelliteData.ndviSamples.map(s => `${s.name}: ${s.ndvi}`).join(', ')}
        - Satellite: ${satelliteData.satelliteDetected}
        - Image Date: ${satelliteData.imageDate}
        - Cloud Cover: ${satelliteData.cloudCoverPercent}%

        PEST OUTBREAK ANALYSIS:
        - Pest Risk Level: ${satelliteData.pestRisk}
        - Pest Alert: ${satelliteData.pestAlert || 'No localized anomaly detected.'}

        NITROGEN / FERTILIZER ANALYSIS (NDRE - Red Edge Band):
        - NDRE Value: ${satelliteData.ndreValue} (< 0.25 = critical deficiency, < 0.35 = low)
        - Nitrogen Status: ${satelliteData.nitrogenStatus}
        - Fertilizer Advice: ${satelliteData.fertilizerAdvice || 'Nitrogen levels are adequate. No fertilizer needed.'}

        CLIMATE & SOIL DATA (Last 7 Days via NASA POWER):
        - Root Zone Soil Moisture: ${weatherData.soilMoisturePercent}%
        - Total Rainfall (7 days): ${weatherData.sevenDayPrecipitationMm} mm
        - Current Temperature: ${weatherData.currentTempCelsius}°C
        - Relative Humidity: ${weatherData.currentHumidity}%

        ECONOMIC MARKET DATA (CEDA Agmarknet):
        - Nearest Mandi: ${marketData ? marketData.market : 'Unknown'}
        - Current Modal Price: ${marketData ? 'Rs ' + marketData.modalPrice + ' per Quintal' : 'Data Unavailable'}
        - Price Date: ${marketData ? marketData.date : 'N/A'}

        Generate the advisory in this exact JSON format:
        {
            "alerts": ["Array of urgent alerts if any (pest, weather, disease). Empty array if none."],
            "today": "What the farmer should do TODAY.",
            "tomorrow": "What the farmer should do TOMORROW.",
            "day3": "What the farmer should do on DAY 3.",
            "irrigationAdvice": "One sentence on irrigation based on soil moisture and rain.",
            "fertilizerAdvice": "One sentence on fertilizer based on NDRE/nitrogen status.",
            "harvestAdvice": "One sentence on harvest timing based on market price.",
            "resourceSaving": "Estimate of water/money saved by following this advice."
        }

        Return ONLY the JSON object. No markdown, no explanation.
        `;

        // 5. Call OpenAI Compatible API
        const response = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.7
        });
        
        let advisoryText = response.choices[0].message.content;
        
        // Parse the structured JSON response from AI
        let advisoryJSON;
        try {
            // Strip markdown code fences if AI wraps them
            advisoryText = advisoryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            advisoryJSON = JSON.parse(advisoryText);
        } catch (e) {
            // If AI doesn't return valid JSON, wrap in a simple structure
            advisoryJSON = {
                alerts: [],
                today: advisoryText,
                tomorrow: "Monitor your crops closely.",
                day3: "Re-check satellite data for updates.",
                irrigationAdvice: "Check soil moisture before irrigating.",
                fertilizerAdvice: "No specific recommendation available.",
                harvestAdvice: "Monitor market prices.",
                resourceSaving: "Follow the advisory to optimize resources."
            };
        }

        // 6. Return the fully fused response
        res.json({
            success: true,
            data: {
                satellite: satelliteData,
                weather: weatherData,
                market: marketData,
                advisory: advisoryJSON
            }
        });

    } catch (error) {
        console.error("Advisory Error:", error);
        res.status(500).json({ error: "Failed to generate advisory." });
    }
});

// ============================================================
// FEATURE 7: Multimodal AI Diagnostics (Leaf Photo Upload)
// ============================================================
app.post('/api/diagnose-image', async (req, res) => {
    try {
        const { lat, lon, state, commodity, imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: "No image provided." });
        }

        console.log(`[Bhoomi Sense] Diagnosing uploaded leaf image...`);

        // Fetch environmental context to combine with visual diagnosis
        const weatherData = await fetchNASAData(lat || 20.5, lon || 78.9);

        const messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `You are 'Bhoomi Sense', an expert crop disease diagnostician for Indian farmers.

                        The farmer has uploaded a photo of their ${commodity || 'crop'} leaf from ${state || 'India'}.
                        
                        Current environmental conditions at their field:
                        - Temperature: ${weatherData.currentTempCelsius}°C
                        - Humidity: ${weatherData.currentHumidity}%
                        - Recent Rainfall: ${weatherData.sevenDayPrecipitationMm} mm

                        Analyze the leaf image and respond in this JSON format:
                        {
                            "diseaseName": "Name of detected disease or 'Healthy'",
                            "confidence": "HIGH / MEDIUM / LOW",
                            "severity": "MILD / MODERATE / SEVERE / NONE",
                            "cause": "What is causing this (fungal, bacterial, nutrient, pest, etc.)",
                            "treatment": "Exact treatment recommendation with product names and dosage",
                            "prevention": "How to prevent this in the future",
                            "urgency": "IMMEDIATE / WITHIN_3_DAYS / MONITOR"
                        }
                        
                        Return ONLY the JSON object.`
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`
                        }
                    }
                ]
            }
        ];

        const response = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: messages,
            max_tokens: 400
        });

        let diagnosisText = response.choices[0].message.content;
        
        let diagnosis;
        try {
            diagnosisText = diagnosisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            diagnosis = JSON.parse(diagnosisText);
        } catch (e) {
            diagnosis = {
                diseaseName: "Analysis Incomplete",
                confidence: "LOW",
                severity: "UNKNOWN",
                cause: diagnosisText,
                treatment: "Please consult a local agricultural extension officer.",
                prevention: "Regular crop inspection recommended.",
                urgency: "MONITOR"
            };
        }

        res.json({
            success: true,
            data: {
                diagnosis: diagnosis,
                weather: weatherData
            }
        });

    } catch (error) {
        console.error("Image Diagnosis Error:", error);
        res.status(500).json({ error: "Failed to diagnose image." });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
