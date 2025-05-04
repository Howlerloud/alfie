const apiKey = "5b3ce3597851110001cf62486e213e02beab4427912e245105956bd6";
const fixedStart = [0.9195, 51.9136]; // [lng, lat]

const map = L.map("map").setView([fixedStart[1], fixedStart[0]], 13);

// === Load Map Tiles ===
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// === State ===
let coordinates = [fixedStart];
let dropoffMarkers = [];
let routeLayer = null;
let dropoffCount = 0;

// === UI Display Helpers ===
function updateUI(distance = 0, time = "0 min", cost = 0, extraDropoffFee = 0, milesCost = 0) {
  document.getElementById("distance").innerText = `Total Distance: ${distance.toFixed(2)} miles (${time})`;
  document.getElementById("travel-time").innerText = `Travel Time: ${time}`;
  document.getElementById("value").innerText = `Total Cost: £${cost}`;
  document.getElementById("extra-drops-fee").innerText = `Extra Stops Fee: £${extraDropoffFee}`;
  document.getElementById("miles-cost").innerText = `Distance Cost: £${milesCost}`
}

function resetUI() {
  updateUI(0, "0 min", 0, 0, 0);
}

// === Add Fixed Departure Marker ===
L.marker([fixedStart[1], fixedStart[0]], {
  icon: L.icon({
    iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
})
.addTo(map)
.bindPopup("Departure Point")
.openPopup();

// === Add Dropoff on Map Click ===
map.on("click", (e) => {
  if (dropoffCount >= 4) {
    Swal.fire("Maximum of 4 drop off points allowed.");
    return;
  }

  const point = [e.latlng.lng, e.latlng.lat];
  coordinates.push(point);
  dropoffCount++;

  const marker = L.marker(e.latlng)
    .addTo(map)
    .bindPopup(`Dropoff ${dropoffCount}`)
    .openPopup();

  dropoffMarkers.push(marker);

  drawRoute();
});

// === Draw Route and Calculate Cost/Time ===
function drawRoute() {
  if (coordinates.length < 2) {
    resetUI();
    if (routeLayer) {
      map.removeLayer(routeLayer);
      routeLayer = null;
    }
    return;
  }

  const routeCoordinates = [...coordinates, fixedStart];

  fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ coordinates: routeCoordinates })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const summary = data.features?.[0]?.properties?.summary;

      if (!summary || summary.distance == null || summary.duration == null) {
        throw new Error("Missing distance or duration in route summary.");
      }

      const distanceMiles = summary.distance / 1609.34;
      const durationSeconds = summary.duration;
      const baseCost = distanceMiles * 1.1 + 60;
      const milesCost = (distanceMiles * 1.1).toFixed(2);
      // Add £15 for each drop off after the second one (i.e., starting from the 3rd)
      const extraDropoffFee = dropoffCount > 2 ? (dropoffCount - 2) * 15 : 0;
      const totalCost = (baseCost + extraDropoffFee).toFixed(2);

      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.round((durationSeconds % 3600) / 60);
      const durationString = hours ? `${hours}h ${minutes}m` : `${minutes} min`;

      updateUI(distanceMiles, durationString, totalCost, extraDropoffFee, milesCost);

      if (routeLayer) map.removeLayer(routeLayer);

      routeLayer = L.geoJSON(data, {
        style: { color: "blue", weight: 4 }
      }).addTo(map);
    })
    .catch(error => {
      console.error("Routing error:", error);
      Swal.fire("Sorry, there was an issue with routing. Please try again.");

      // Rollback last point
      const lastMarker = dropoffMarkers.pop();
      map.removeLayer(lastMarker);
      coordinates.pop();
      dropoffCount--;

      drawRoute();
    });
}

// === Clear All Dropoffs ===
document.getElementById("clearBtn").addEventListener("click", () => {
  dropoffMarkers.forEach(marker => map.removeLayer(marker));
  dropoffMarkers = [];

  coordinates = [fixedStart];
  dropoffCount = 0;

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  resetUI();
});

// === Remove Last Dropoff ===
document.getElementById("removeBtn").addEventListener("click", () => {
  if (dropoffMarkers.length === 0) return;

  const lastMarker = dropoffMarkers.pop();
  map.removeLayer(lastMarker);
  coordinates.pop();
  dropoffCount--;

  drawRoute();
});