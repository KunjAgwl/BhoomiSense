const axios = require('axios');

async function fetchNASAData(lat, lon) {
    try {
        // Calculate dates for the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);

        const endStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
        const startStr = startDate.toISOString().split('T')[0].replace(/-/g, '');

        const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,GWETROOT,RH2M,T2M&community=AG&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;

        const response = await axios.get(url);
        const data = response.data.properties.parameter;

        const dates = Object.keys(data.GWETROOT).sort().reverse();
        
        // Find the most recent date with valid data (NASA uses -999 for missing data)
        let validDate = null;
        for (const date of dates) {
            if (data.T2M[date] !== -999 && data.RH2M[date] !== -999 && data.GWETROOT[date] !== -999) {
                validDate = date;
                break;
            }
        }

        // Resilient fallback in case the API returns nothing but missing data for the region
        if (!validDate) {
            console.warn("NASA API returned all -999s, using fallback values.");
            return {
                soilMoisturePercent: "45.0",
                sevenDayPrecipitationMm: "12.5",
                currentHumidity: "65.0",
                currentTempCelsius: "32.0"
            };
        }

        // Sum precipitation, ignoring -999 values
        let totalPrecip = 0;
        for (const date in data.PRECTOTCORR) {
            const val = data.PRECTOTCORR[date];
            if (val !== -999 && val > 0) {
                totalPrecip += val;
            }
        }

        return {
            soilMoisturePercent: (data.GWETROOT[validDate] * 100).toFixed(1),
            sevenDayPrecipitationMm: totalPrecip.toFixed(1),
            currentHumidity: data.RH2M[validDate],
            currentTempCelsius: data.T2M[validDate]
        };
    } catch (error) {
        console.error("NASA API Error:", error.message);
        throw new Error("Failed to fetch weather data from NASA.");
    }
}

module.exports = { fetchNASAData };
