const apiKey = '5b3ce3597851110001cf62486e213e02beab4427912e245105956bd6';

// Fixed Start point
const fixedStart = [0.9195, 51.9136]; // [lng, lat]

// Initialize map centered on fixed start
const map = L.map('map').setView([fixedStart[1], fixedStart[0]], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Markers and coordinates
let coordinates = [fixedStart]; // always starts with fixed pickup
let markers = [];
let routeLayer = null;
let dropoffCount = 0;

// Add fixed pickup marker
const startMarker = L.marker([fixedStart[1], fixedStart[0]], {
  icon: L.icon({
    iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}).addTo(map).bindPopup("Pickup Point (Highwoods)").openPopup();

// Event: user clicks to add dropoffs
map.on('click', function (e) {
  const latlng = [e.latlng.lng, e.latlng.lat]; // ORS format
  coordinates.push(latlng);
  dropoffCount++;

  const marker = L.marker(e.latlng)
    .addTo(map)
    .bindPopup(`Dropoff ${dropoffCount}`)
    .openPopup();

  markers.push(marker);

  updateRoute();
});

function updateRoute() {
    if (coordinates.length < 2) return;
  
    // Create a round trip by adding the fixed start point at the end
    const roundTripCoords = [...coordinates, fixedStart];
  
    fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: roundTripCoords
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.features || !data.features[0]) {
        throw new Error("No route data returned.");
      }
  
      const distanceMeters = data.features[0].properties?.summary?.distance;
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
    .catch(err => {
      console.error('Routing error:', err);
      alert(`Routing error: ${err.message}`);
    });
  }

// Clear all dropoffs & route (keep pickup)
document.getElementById('clearBtn').addEventListener('click', () => {
  // Remove dropoff markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  // Clear route
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  // Reset state
  coordinates = [fixedStart];
  dropoffCount = 0;
  document.getElementById('distance').innerText = `Total Distance: 0 miles`;
});