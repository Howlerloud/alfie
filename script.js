const apiKey = '5b3ce3597851110001cf62486e213e02beab4427912e245105956bd6';

// === Initial Setup ===
const fixedStart = [0.9195, 51.9136]; // [lng, lat]
const map = L.map('map').setView([fixedStart[1], fixedStart[0]], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// === State Variables ===
let coordinates = [fixedStart]; // Starts with the fixed pickup point
let dropoffMarkers = [];
let routeLayer = null;
let dropoffCount = 0;

// === Add Fixed Pickup Marker ===
L.marker([fixedStart[1], fixedStart[0]], {
  icon: L.icon({
    iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
})
.addTo(map)
.bindPopup("Departure Point")
.openPopup();

// === Map Click Handler to Add Dropoffs ===
map.on('click', (e) => {
  const clickedPoint = [e.latlng.lng, e.latlng.lat];
  coordinates.push(clickedPoint);
  dropoffCount++;

  const newMarker = L.marker(e.latlng)
    .addTo(map)
    .bindPopup(`Dropoff ${dropoffCount}`)
    .openPopup();

  dropoffMarkers.push(newMarker);
  drawRoute();
});

// === Function to Request and Display Route ===
function drawRoute() {
  if (coordinates.length < 2) return;

  const routeCoordinates = [...coordinates, fixedStart]; // round trip

  fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ coordinates: routeCoordinates })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      const summary = data.features?.[0]?.properties?.summary;
      const distanceMeters = summary?.distance;

      if (distanceMeters == null) {
        throw new Error("Route summary missing.");
      }

      const distanceMiles = (distanceMeters / 1609.34).toFixed(2);
      document.getElementById('distance').innerText = `Round Trip Distance: ${distanceMiles} miles`;

      if (routeLayer) map.removeLayer(routeLayer);

      routeLayer = L.geoJSON(data, {
        style: { color: 'blue', weight: 4 }
      }).addTo(map);
    })

    .catch(error => {
      console.error('Routing error:', error);
      Swal.fire(`Im sorry, the map cant access this area please select the closest road.
        Many Thanks :)`);

        // Remove last dropoff marker
        const lastMarker = dropoffMarkers.pop();
        map.removeLayer(lastMarker);

        coordinates.pop();

        dropoffCount--;

        drawRoute();
    });
}

// === Clear Button Handler ===
document.getElementById('clearBtn').addEventListener('click', () => {
  // Remove all dropoff markers
  dropoffMarkers.forEach(marker => map.removeLayer(marker));
  dropoffMarkers = [];

  // Remove route layer if exists
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  // Reset state
  coordinates = [fixedStart];
  dropoffCount = 0;
  document.getElementById('distance').innerText = `Total Distance: 0 miles`;
});

// === Clear Button Handler ===
document.getElementById('removeBtn').addEventListener('click', () => {
  if (dropoffMarkers.length === 0) return;

  // Remove last dropoff marker
  const lastMarker = dropoffMarkers.pop();
  map.removeLayer(lastMarker);

 coordinates.pop();

 dropoffCount--;

 drawRoute();
});
 