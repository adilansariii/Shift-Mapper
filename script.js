const TZDB_KEY = "FCBRP4K0G6LK";
const NINJA_KEY = "gTleHSZgUyxnyh4BvnoVHA==VRQyItsRQ3j8byPK";

async function findShift() {
  const city = document.getElementById("cityInput").value.trim();
  const resultDiv = document.getElementById("result");
  const loadingDiv = document.getElementById("loading");

  if (!city) {
    resultDiv.textContent = "Please enter a city name.";
    return;
  }

  loadingDiv.style.display = "block";
  resultDiv.textContent = "";

  try {
    const geoRes = await fetch(`https://api.api-ninjas.com/v1/geocoding?city=${city}`, {
      headers: { "X-Api-Key": NINJA_KEY }
    });
    const geoData = await geoRes.json();

    loadingDiv.style.display = "none";

    if (!geoData.length) {
      resultDiv.textContent = "City not found.";
      return;
    }

    if (geoData.length > 1) {
      resultDiv.innerHTML = `<strong>Multiple cities found. Please select one:</strong><br/>`;
      geoData.forEach(c => {
        const btn = document.createElement("button");
        btn.textContent = `${c.name}, ${c.country}`;
        btn.onclick = () => calculateShift(c);
        resultDiv.appendChild(btn);
      });
    } else {
      calculateShift(geoData[0]);
    }
  } catch (err) {
    loadingDiv.style.display = "none";
    console.error(err);
    resultDiv.textContent = "Something went wrong. Please check your API keys or connection.";
  }
}

async function calculateShift(cityInfo) {
  const resultDiv = document.getElementById("result");
  const loadingDiv = document.getElementById("loading");
  loadingDiv.style.display = "block";

  const { name, country, latitude, longitude } = cityInfo;

  try {
    const tzRes = await fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=${TZDB_KEY}&format=json&by=position&lat=${latitude}&lng=${longitude}`);
    const tzData = await tzRes.json();

    loadingDiv.style.display = "none";

    if (tzData.status !== "OK") {
      resultDiv.textContent = "Time zone data unavailable.";
      return;
    }

    const cityOffsetSec = tzData.gmtOffset;
    const istOffsetSec = 19800; // IST UTC+5:30

    const shifts = [
      { name: "IST Shift", istStart: 10, istEnd: 19 },
      { name: "UK Shift",  istStart: 12, istEnd: 21 },
      { name: "US Shift",  istStart: 22, istEnd: 7 }
    ];

    const shiftScores = shifts.map(shift => {
      const cityStart = (shift.istStart * 3600 + cityOffsetSec - istOffsetSec) / 3600;
      const cityEnd = (shift.istEnd * 3600 + cityOffsetSec - istOffsetSec) / 3600;

      const normStart = (cityStart + 24) % 24;
      const normEnd = (cityEnd + 24) % 24;

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

    const bestShift = shiftScores.sort((a, b) => b.score - a.score)[0];

    resultDiv.innerHTML = `
      <strong>City:</strong> ${name}, ${country}<br/>
      <strong>Offset from IST:</strong> ${(cityOffsetSec - istOffsetSec) / 3600} hrs<br/>
      <strong>Best Shift:</strong> ${bestShift.name}<br/>
      <small>Local working window: ${formatHour(bestShift.localStart)} – ${formatHour(bestShift.localEnd)}</small>
    `;
  } catch (err) {
    loadingDiv.style.display = "none";
    console.error(err);
    resultDiv.textContent = "Something went wrong while fetching timezone data.";
  }
}

function formatHour(hour) {
  const h = Math.floor(hour) % 24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${ampm}`;
}

// Trigger findShift on Enter key
document.getElementById("cityInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") findShift();
});
