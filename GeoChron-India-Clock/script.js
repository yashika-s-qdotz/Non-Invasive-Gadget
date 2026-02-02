// --------------------
// MAP INITIALIZATION
// --------------------
const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let marker;

// --------------------
// PINCODE → LAT/LON + PLACE
// --------------------
async function getLatLonFromPincode(pincode) {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&country=India&postalcode=${pincode}&addressdetails=1`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.length === 0) {
    throw "Invalid pincode";
  }

  const address = data[0].address;

  const placeName =
    address.town ||
    address.city ||
    address.village ||
    address.county ||
    "Unknown place";

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    place: placeName,
    district: address.state_district || "",
    state: address.state || ""
  };
}

// --------------------
// IST → UTC (CORRECT)
// --------------------
function istToUTC(dateStr, timeStr) {

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hh, mm, ss] = timeStr.split(":").map(Number);

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
// GEOCHRON (LOCAL SOLAR TIME)
// LST = UTC + (Longitude / 15)
// --------------------
function calculateGeoChronTime(utcDate, longitude) {

  const utcHours =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes() / 60 +
    utcDate.getUTCSeconds() / 3600;

  const longitudeOffset = longitude / 15;

  let localSolarTime = utcHours + longitudeOffset;

  if (localSolarTime < 0) localSolarTime += 24;
  if (localSolarTime >= 24) localSolarTime -= 24;

  return localSolarTime;
}

// --------------------
// FORMAT HH:MM:SS
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
// MAIN CONTROLLER
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
    // 1️⃣ Get location details
    const { lat, lon, place, district, state } =
      await getLatLonFromPincode(pincode);

    // 2️⃣ Update place name (CENTER HIGHLIGHT)
    document.getElementById("placeName").innerText =
      `${place}, ${district}, ${state}`;

    // 3️⃣ Update coordinates
    document.getElementById("lat").innerText = lat.toFixed(4);
    document.getElementById("lon").innerText = lon.toFixed(4);

    // 4️⃣ GeoChron calculation
    const utcDate = istToUTC(date, time);
    const geoTime = calculateGeoChronTime(utcDate, lon);

    document.getElementById("geoTime").innerText =
      formatTime(geoTime);

    // 5️⃣ Map marker
    if (marker) map.removeLayer(marker);

    marker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(
        `<b>${place}</b><br>${district}<br>${state}`
      )
      .openPopup();

    map.setView([lat, lon], 7);

  } catch (err) {
    alert(err);
  }
}
