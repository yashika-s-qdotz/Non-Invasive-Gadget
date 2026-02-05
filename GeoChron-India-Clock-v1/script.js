// --------------------
// MAP INITIALIZATION
// --------------------
const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let marker;

// --------------------
// CLEAR FORM FUNCTION
// --------------------
function clearForm() {
  document.getElementById("date").value = "";
  document.getElementById("time").value = "";
  document.getElementById("pincode").value = "";
  document.getElementById("areaDropdown").innerHTML = '<option value="">-- Select Area --</option>';
  document.getElementById("areaDropdown").disabled = true;
  document.getElementById("calculateBtn").disabled = true;
  
  document.getElementById("lat").innerText = "--";
  document.getElementById("lon").innerText = "--";
  document.getElementById("geoTime").innerText = "--";
  
  if (marker) {
    map.removeLayer(marker);
  }
  map.setView([22.5, 78.9], 5);
}

// --------------------
// FETCH POSTAL AREAS FROM PINCODE
// --------------------
async function fetchPostalAreas() {
  const pincode = document.getElementById("pincode").value;
  const areaDropdown = document.getElementById("areaDropdown");
  const calculateBtn = document.getElementById("calculateBtn");

  if (!pincode) {
    alert("Please enter a pincode");
    return;
  }

  if (!/^\d{6}$/.test(pincode)) {
    alert("Please enter a valid 6-digit pincode");
    return;
  }

  try {
    const url = `https://api.postalpincode.in/pincode/${pincode}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data[0].Status === "Error" || !data[0].PostOffice) {
      alert("Invalid pincode or no data found");
      return;
    }

    // Clear previous options
    areaDropdown.innerHTML = '<option value="">-- Select Area --</option>';

    // Populate dropdown with post office names
    data[0].PostOffice.forEach(office => {
      const option = document.createElement("option");
      option.value = JSON.stringify({
        name: office.Name,
        district: office.District,
        state: office.State,
        pincode: pincode
      });
      option.textContent = `${office.Name} - ${office.District}`;
      areaDropdown.appendChild(option);
    });

    // Enable dropdown and calculate button
    areaDropdown.disabled = false;
    calculateBtn.disabled = false;

    alert(`Found ${data[0].PostOffice.length} postal area(s). Please select one.`);

  } catch (err) {
    alert("Error fetching postal areas: " + err);
  }
}

// --------------------
// GET LAT/LON FROM AREA NAME WITH FALLBACK
// --------------------
async function getLatLonFromArea(areaData) {
  const { name, district, state, pincode } = areaData;
  
  // Try multiple search strategies
  const searchQueries = [
    `${name}, ${district}, ${state}, India`,  // Most specific
    `${district}, ${state}, India`,            // District level
    `${pincode}, India`                        // Pincode fallback
  ];
  
  for (let i = 0; i < searchQueries.length; i++) {
    try {
      const url = 
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(searchQueries[i])}&limit=1`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
      }
      
      // Wait a bit before trying next query to respect rate limits
      if (i < searchQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error(`Search attempt ${i + 1} failed:`, err);
    }
  }
  
  throw "Unable to find location. Please try selecting a different area or enter a different pincode.";
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
  const areaDropdown = document.getElementById("areaDropdown");
  const selectedArea = areaDropdown.value;

  if (!date || !time) {
    alert("Please fill date and time fields");
    return;
  }

  if (!selectedArea) {
    alert("Please select an area from the dropdown");
    return;
  }

  try {
    const areaData = JSON.parse(selectedArea);
    const { lat, lon } = await getLatLonFromArea(areaData);

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
