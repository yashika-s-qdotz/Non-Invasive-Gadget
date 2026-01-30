// --------------------
// MAP INITIALIZATION
// --------------------
const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let marker;

// --------------------
// PINCODE → LAT/LON
// --------------------
async function getLatLonFromPincode(pincode) {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&country=India&postalcode=${pincode}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.length === 0) {
    throw "Invalid pincode";
  }

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

// --------------------
// IST → UTC
// --------------------
function istToUTC(dateStr, timeStr) {

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hh, mm, ss] = timeStr.split(":").map(Number);

  // Create UTC date directly (NO local timezone interference)
  const utcMillis = Date.UTC(
    year,
    month - 1,
    day,
    hh - 5,
    mm - 30,
    ss || 0
  );

  return new Date(utcMillis);
}

// --------------------
// ✅ CORRECT GEOCHRON LOGIC
// Local Solar Time = UTC + (longitude / 15)
// --------------------
function calculateGeoChronTime(utcDate, longitude) {

  const utcHours =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes() / 60 +
    utcDate.getUTCSeconds() / 3600;

  const longitudeOffset = longitude / 15;

  let localSolarTime = utcHours + longitudeOffset;

  // Handle day crossing only
  if (localSolarTime < 0) localSolarTime += 24;
  if (localSolarTime >= 24) localSolarTime -= 24;

  return localSolarTime;
}

// --------------------
// FORMAT TIME
// --------------------
function formatTime(decimal) {
  const h = Math.floor(decimal);
  const m = Math.floor((decimal - h) * 60);
  const s = Math.floor((((decimal - h) * 60) - m) * 60);

  return `${String(h).padStart(2,"0")}:` +
         `${String(m).padStart(2,"0")}:` +
         `${String(s).padStart(2,"0")}`;
}

// --------------------
// MAIN FUNCTION
// --------------------
async function calculateGeoChron() {

  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const pincode = document.getElementById("pincode").value;

  if (!date || !time || !pincode) {
    alert("Please fill all fields");
    return;
  }

  try {
    const { lat, lon } = await getLatLonFromPincode(pincode);

    document.getElementById("lat").innerText = lat.toFixed(4);
    document.getElementById("lon").innerText = lon.toFixed(4);

    const utcDate = istToUTC(date, time);
    const geoTime = calculateGeoChronTime(utcDate, lon);

    document.getElementById("geoTime").innerText =
      formatTime(geoTime);

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], 7);

  } catch (err) {
    alert(err);
  }
}
