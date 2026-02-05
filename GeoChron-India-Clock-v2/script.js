// --------------------
// MAP
// --------------------
const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

let marker;

// --------------------
// PINCODE → POST OFFICES
// --------------------
async function fetchLocations() {
  const pincode = document.getElementById("pincode").value;
  const select = document.getElementById("areaSelect");

  select.innerHTML = `<option>Loading...</option>`;

  const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
  const data = await res.json();

  if (data[0].Status !== "Success") {
    alert("Invalid pincode");
    return;
  }

  select.innerHTML = `<option value="">-- select --</option>`;

  data[0].PostOffice.forEach(po => {
    const option = document.createElement("option");
    option.value = `${po.Name}, ${po.District}, ${po.State}`;
    option.textContent = `${po.Name} (${po.District})`;
    select.appendChild(option);
  });
}

// --------------------
// PHOTON GEOCODING
// --------------------
async function getLatLonFromPhoton(place) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(place)}&limit=1`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.features.length) throw "Location not found";

  const f = data.features[0];

  return {
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    name: f.properties.name || place
  };
}

// --------------------
// IST → UTC
// --------------------
function istToUTC(dateStr, timeStr) {
  const [y,m,d] = dateStr.split("-").map(Number);
  const [hh,mm,ss] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, m-1, d, hh-5, mm-30, ss||0));
}

// --------------------
// GEOCHRON
// --------------------
function calculateGeoChronTime(utcDate, lon) {
  let t =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes()/60 +
    utcDate.getUTCSeconds()/3600 +
    lon/15;

  if (t < 0) t += 24;
  if (t >= 24) t -= 24;
  return t;
}

function formatTime(t) {
  const h = Math.floor(t);
  const m = Math.floor((t-h)*60);
  const s = Math.floor((((t-h)*60)-m)*60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// --------------------
// MAIN
// --------------------
async function calculateGeoChron() {
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const place = document.getElementById("areaSelect").value;

  if (!date || !time || !place) {
    alert("Fill all fields");
    return;
  }

  const { lat, lon, name } = await getLatLonFromPhoton(place);

  document.getElementById("placeName").innerText = place;
  document.getElementById("lat").innerText = lat.toFixed(6);
  document.getElementById("lon").innerText = lon.toFixed(6);

  const utc = istToUTC(date, time);
  const geo = calculateGeoChronTime(utc, lon);

  document.getElementById("geoTime").innerText = formatTime(geo);

  if (marker) map.removeLayer(marker);

  marker = L.marker([lat, lon]).addTo(map).bindPopup(place).openPopup();
  map.setView([lat, lon], 14);
}
