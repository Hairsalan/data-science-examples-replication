/**
 * Leaflet.js interactive map module for NYC Taxi Trip Prediction
 */

class TaxiMapManager {
  constructor(containerId, onCoordinatesChanged) {
    this.containerId = containerId;
    this.onCoordinatesChanged = onCoordinatesChanged;
    this.map = null;
    this.pickupMarker = null;
    this.dropoffMarker = null;
    this.routeLayer = null;
    this.clickTarget = "dropoff"; // toggles after click

    // Default: JFK Airport to Times Square
    this.pickupCoords = [40.6413, -73.7781];
    this.dropoffCoords = [40.7580, -73.9855];

    this.initMap();
  }

  initMap() {
    // Center of NYC
    this.map = L.map(this.containerId, {
      center: [40.7306, -73.9352],
      zoom: 12,
      zoomControl: true,
      minZoom: 10,
      maxZoom: 18,
    });

    // Dark Matter tile layer for sleek modern aesthetics
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(this.map);

    // Custom Icons
    const createCustomIcon = (color, text) => {
      return L.divIcon({
        className: "custom-pin",
        html: `
          <div style="
            background: ${color};
            color: #fff;
            font-weight: 800;
            font-size: 11px;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            border: 2px solid white;
          ">
            <span style="transform: rotate(45deg);">${text}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
    };

    const pickupIcon = createCustomIcon("#10b981", "P");
    const dropoffIcon = createCustomIcon("#ef4444", "D");

    // Add Draggable Markers
    this.pickupMarker = L.marker(this.pickupCoords, {
      draggable: true,
      icon: pickupIcon,
      title: "Pickup Location (Drag to Move)",
    }).addTo(this.map);

    this.dropoffMarker = L.marker(this.dropoffCoords, {
      draggable: true,
      icon: dropoffIcon,
      title: "Dropoff Location (Drag to Move)",
    }).addTo(this.map);

    // Marker Drag Events
    this.pickupMarker.on("dragend", () => {
      const pos = this.pickupMarker.getLatLng();
      this.pickupCoords = [pos.lat, pos.lng];
      this.drawRoute();
      if (this.onCoordinatesChanged) this.onCoordinatesChanged(this.getCoordinates());
    });

    this.dropoffMarker.on("dragend", () => {
      const pos = this.dropoffMarker.getLatLng();
      this.dropoffCoords = [pos.lat, pos.lng];
      this.drawRoute();
      if (this.onCoordinatesChanged) this.onCoordinatesChanged(this.getCoordinates());
    });

    // Map Click to place markers alternatively
    this.map.on("click", (e) => {
      if (this.clickTarget === "dropoff") {
        this.dropoffCoords = [e.latlng.lat, e.latlng.lng];
        this.dropoffMarker.setLatLng(e.latlng);
        this.clickTarget = "pickup";
      } else {
        this.pickupCoords = [e.latlng.lat, e.latlng.lng];
        this.pickupMarker.setLatLng(e.latlng);
        this.clickTarget = "dropoff";
      }
      this.drawRoute();
      if (this.onCoordinatesChanged) this.onCoordinatesChanged(this.getCoordinates());
    });

    // Initial Route and Fit Bounds
    this.drawRoute();
    this.fitBounds();
  }

  getCoordinates() {
    return {
      pickup_lat: this.pickupCoords[0],
      pickup_lon: this.pickupCoords[1],
      dropoff_lat: this.dropoffCoords[0],
      dropoff_lon: this.dropoffCoords[1],
    };
  }

  setCoordinates(pickupLat, pickupLon, dropoffLat, dropoffLon, autoFit = true) {
    this.pickupCoords = [pickupLat, pickupLon];
    this.dropoffCoords = [dropoffLat, dropoffLon];
    this.pickupMarker.setLatLng(this.pickupCoords);
    this.dropoffMarker.setLatLng(this.dropoffCoords);
    this.drawRoute();
    if (autoFit) this.fitBounds();
  }

  fitBounds() {
    const bounds = L.latLngBounds([this.pickupCoords, this.dropoffCoords]);
    this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }

  async drawRoute() {
    // Clear previous route
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }

    const [pLat, pLon] = this.pickupCoords;
    const [dLat, dLon] = this.dropoffCoords;

    try {
      // Call OSRM public routing API for realistic turn-by-turn road geometry
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${dLon},${dLat}?overview=full&geometries=geojson`;
      const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(3500) });
      const data = await response.json();

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const routeGeoJSON = data.routes[0].geometry;
        this.routeLayer = L.geoJSON(routeGeoJSON, {
          style: {
            color: "#3b82f6",
            weight: 5,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round",
          },
        }).addTo(this.map);
        return;
      }
    } catch (err) {
      console.warn("OSRM routing unavailable, falling back to direct line:", err);
    }

    // Fallback: direct styled polyline
    this.routeLayer = L.polyline([this.pickupCoords, this.dropoffCoords], {
      color: "#3b82f6",
      weight: 4,
      dashArray: "6, 8",
      opacity: 0.75,
    }).addTo(this.map);
  }
}
