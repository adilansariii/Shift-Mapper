const TZDB_KEY = "FCBRP4K0G6LK";
const NINJA_KEY = "gTleHSZgUyxnyh4BvnoVHA==VRQyItsRQ3j8byPK";

async function findShift() {
  const city = document.getElementById("cityInput").value.trim();
  const resultDiv = document.getElementById("result");

  if (!city) {
    resultDiv.textContent = "Please enter a city name.";
    return;
  }

  try {
    // Step 1: Get coordinates from API Ninjas
    const geoRes = await fetch(`https://api.api-ninjas.com/v1/geocoding?city=${city}`, {
      headers: { "X-Api-Key": NINJA_KEY }
    });
    const geoData = await geoRes.json();

    if (!geoData[0]) {
      resultDiv.textContent = "City not found.";
      return;
    }

    const { latitude, longitude } = geoData[0];

    // Step 2: Get timezone offset using TimeZoneDB (ensure HTTPS)
    const tzRes = await fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=${TZDB_KEY}&format=json&by=position&lat=${latitude}&lng=${longitude}`);
    const tzData = await tzRes.json();

    if (tzData.status !== "OK") {
      resultDiv.textContent = "Time zone data unavailable.";
      return;
    }

    const cityOffsetSec = tzData.gmtOffset; // City offset in seconds
    const istOffsetSec = 19800; // IST = UTC+5:30 = 19800 seconds

    // Step 3: Define shifts in IST hours
    const shifts = [
      { name: "IST Shift", istStart: 10, istEnd: 19 },
      { name: "UK Shift",  istStart: 12, istEnd: 21 },
      { name: "US Shift",  istStart: 22, istEnd: 7 }
    ];

    // Step 4: Convert IST shift hours to local time in city
    const shiftScores = shifts.map(shift => {
      const cityStart = (shift.istStart * 3600 + cityOffsetSec - istOffsetSec) / 3600;
      const cityEnd = (shift.istEnd * 3600 + cityOffsetSec - istOffsetSec) / 3600;

      const normStart = (cityStart + 24) % 24;
      const normEnd = (cityEnd + 24) % 24;

      // Score overlap with typical local working hours (9am–6pm)
      let score = 0;
      for (let hour = 9; hour <= 18; hour++) {
        if (normStart < normEnd) {
          if (hour >= normStart && hour <= normEnd) score++;
        } else {
          if (hour >= normStart || hour <= normEnd) score++;
        }
      }

      return { ...shift, localStart: normStart, localEnd: normEnd, score };
    });

    // Step 5: Find the shift with highest overlap score
    const bestShift = shiftScores.sort((a, b) => b.score - a.score)[0];

    // Step 6: Display result
    resultDiv.innerHTML = `
      <strong>City:</strong> ${city}<br/>
      <strong>Offset from IST:</strong> ${(cityOffsetSec - istOffsetSec) / 3600} hrs<br/>
      <strong>Best Shift:</strong> ${bestShift.name}<br/>
      <small>Local working window: ${formatHour(bestShift.localStart)} – ${formatHour(bestShift.localEnd)}</small>
    `;
  } catch (err) {
    console.error("API Error:", err);
    resultDiv.textContent = "Something went wrong. Please check your API keys or connection.";
  }
}

function formatHour(hour) {
  const h = Math.floor(hour) % 24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${ampm}`;
}
