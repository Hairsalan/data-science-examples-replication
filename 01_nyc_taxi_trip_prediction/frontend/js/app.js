/**
 * Main Application Controller for NYC Taxi Intelligence Dashboard
 */

document.addEventListener("DOMContentLoaded", () => {
  let mapManager = null;
  let debounceTimer = null;

  // DOM Elements
  const fareValueEl = document.getElementById("fare-value");
  const durationValueEl = document.getElementById("duration-value");
  const distanceMilesEl = document.getElementById("distance-miles");
  const distanceKmEl = document.getElementById("distance-km");
  const speedMphEl = document.getElementById("speed-mph");
  const congestionBadgeEl = document.getElementById("congestion-badge");
  const isRushHourEl = document.getElementById("is-rush-hour");
  const isOvernightEl = document.getElementById("is-overnight");

  // Fare Breakdown Elements
  const baseFareEl = document.getElementById("breakdown-base");
  const distanceFareEl = document.getElementById("breakdown-distance");
  const surchargesEl = document.getElementById("breakdown-surcharges");
  const tip15El = document.getElementById("tip-15");
  const tip20El = document.getElementById("tip-20");

  // Baseline Comparison Elements
  const baseFareCompEl = document.getElementById("comp-base-fare");
  const baseDurCompEl = document.getElementById("comp-base-dur");

  // Form Inputs
  const datetimeInput = document.getElementById("pickup-datetime");
  const passengerInput = document.getElementById("passenger-count");
  const estimateBtn = document.getElementById("estimate-btn");
  const presetChipsContainer = document.getElementById("preset-chips");

  // Tab Navigation
  const navButtons = document.querySelectorAll(".nav-btn");
  const viewSections = document.querySelectorAll(".view-section");

  // Initialize Default Datetime (Now in Local format for input[type="datetime-local"])
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  datetimeInput.value = `${year}-${month}-${day}T${hours}:${mins}`;

  // Initialize Map
  mapManager = new TaxiMapManager("map", (coords) => {
    debounceEstimate();
  });

  // Debounce API requests on drag
  function debounceEstimate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      triggerEstimation();
    }, 250);
  }

  // Load Presets from API
  async function loadPresets() {
    try {
      const res = await fetch("/api/presets");
      const presets = await res.json();
      presetChipsContainer.innerHTML = "";
      presets.forEach((preset) => {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = preset.name;
        chip.addEventListener("click", () => {
          mapManager.setCoordinates(
            preset.pickup.lat,
            preset.pickup.lon,
            preset.dropoff.lat,
            preset.dropoff.lon
          );
          triggerEstimation();
        });
        presetChipsContainer.appendChild(chip);
      });
    } catch (err) {
      console.warn("Error loading presets:", err);
    }
  }

  // Perform Real-Time Prediction Call
  async function triggerEstimation() {
    if (!mapManager) return;
    const coords = mapManager.getCoordinates();

    const requestPayload = {
      pickup_latitude: coords.pickup_lat,
      pickup_longitude: coords.pickup_lon,
      dropoff_latitude: coords.dropoff_lat,
      dropoff_longitude: coords.dropoff_lon,
      pickup_datetime: datetimeInput.value.replace("T", " ") + ":00",
      passenger_count: parseInt(passengerInput.value, 10) || 1,
    };

    try {
      fareValueEl.style.opacity = "0.5";
      durationValueEl.style.opacity = "0.5";

      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) throw new Error("Estimation failed");
      const data = await response.json();
      updateUI(data);
    } catch (err) {
      console.error("API Estimation error:", err);
    } finally {
      fareValueEl.style.opacity = "1";
      durationValueEl.style.opacity = "1";
    }
  }

  // Update UI with API response
  function updateUI(data) {
    fareValueEl.textContent = `$${data.fare_amount.toFixed(2)}`;
    durationValueEl.textContent = `${data.trip_duration_minutes} min`;

    distanceMilesEl.textContent = `${data.distance_miles} mi`;
    distanceKmEl.textContent = `${data.distance_km} km`;
    speedMphEl.textContent = `${data.average_speed_mph} mph`;

    // Congestion Tag
    congestionBadgeEl.textContent = data.traffic_congestion_level;
    congestionBadgeEl.className = "badge-tag";
    if (data.traffic_congestion_level.includes("Heavy") || data.traffic_congestion_level.includes("Peak")) {
      congestionBadgeEl.classList.add("congestion-heavy");
    } else if (data.traffic_congestion_level.includes("Moderate")) {
      congestionBadgeEl.classList.add("congestion-moderate");
    } else {
      congestionBadgeEl.classList.add("congestion-light");
    }

    isRushHourEl.textContent = data.is_rush_hour ? "Yes (Congestion Rate)" : "No";
    isOvernightEl.textContent = data.is_overnight ? "Yes (Night Surcharge)" : "No";

    // Breakdown
    baseFareEl.textContent = `$${data.fare_breakdown.base_charge.toFixed(2)}`;
    distanceFareEl.textContent = `$${data.fare_breakdown.distance_fare.toFixed(2)}`;
    surchargesEl.textContent = `$${data.fare_breakdown.surcharges.toFixed(2)}`;
    tip15El.textContent = `$${data.fare_breakdown.suggested_tip_15.toFixed(2)}`;
    tip20El.textContent = `$${data.fare_breakdown.suggested_tip_20.toFixed(2)}`;

    // Comparison with Baseline
    if (data.baseline) {
      baseFareCompEl.textContent = `$${data.baseline.fare_amount.toFixed(2)}`;
      baseDurCompEl.textContent = `${data.baseline.trip_duration_minutes} min`;
    }
  }

  // Event Listeners for Controls
  estimateBtn.addEventListener("click", triggerEstimation);
  datetimeInput.addEventListener("change", triggerEstimation);
  passengerInput.addEventListener("change", triggerEstimation);

  // Tab Navigation Handling
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.dataset.tab;
      navButtons.forEach((b) => b.classList.remove("active"));
      viewSections.forEach((v) => v.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`${targetView}-view`).classList.add("active");

      if (targetView === "map") {
        setTimeout(() => mapManager.map.invalidateSize(), 150);
      } else if (targetView === "crisp") {
        loadCrispData();
      }
    });
  });

  // Load CRISP-DM Analytics Data
  async function loadCrispData() {
    try {
      const [modelInfoRes, importanceRes, edaRes] = await Promise.all([
        fetch("/api/model-info"),
        fetch("/api/feature-importance"),
        fetch("/api/eda-summary"),
      ]);

      const modelInfo = await modelInfoRes.json();
      const importance = await importanceRes.json();
      const eda = await edaRes.json();

      renderCrispMetrics(modelInfo.metrics);
      renderFeatureImportance(importance);
      renderEdaSummary(eda);
    } catch (err) {
      console.error("Error loading CRISP-DM data:", err);
    }
  }

  function renderCrispMetrics(metrics) {
    if (!metrics || !metrics.fare_prediction) return;
    const fare = metrics.fare_prediction;
    const dur = metrics.trip_duration_prediction;

    const tbody = document.getElementById("metrics-tbody");
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td><strong>Fare RMSE</strong></td>
        <td>$${fare.baseline.rmse.toFixed(2)}</td>
        <td style="color:#34d399;">$${fare.lightgbm.rmse.toFixed(2)}</td>
        <td style="color:#60a5fa; font-weight:700;">-${fare.improvement_pct.rmse_reduction}%</td>
      </tr>
      <tr>
        <td><strong>Fare MAE</strong></td>
        <td>$${fare.baseline.mae.toFixed(2)}</td>
        <td style="color:#34d399;">$${fare.lightgbm.mae.toFixed(2)}</td>
        <td style="color:#60a5fa; font-weight:700;">-${fare.improvement_pct.mae_reduction}%</td>
      </tr>
      <tr>
        <td><strong>Fare R² Score</strong></td>
        <td>${fare.baseline.r2_score.toFixed(3)}</td>
        <td style="color:#34d399;">${fare.lightgbm.r2_score.toFixed(3)}</td>
        <td style="color:#60a5fa; font-weight:700;">+${((fare.lightgbm.r2_score - fare.baseline.r2_score)*100).toFixed(1)}% pts</td>
      </tr>
      <tr>
        <td><strong>Within $2 Accuracy</strong></td>
        <td>${fare.baseline.within_2_dollars_pct}%</td>
        <td style="color:#34d399;">${fare.lightgbm.within_2_dollars_pct}%</td>
        <td style="color:#60a5fa; font-weight:700;">+${(fare.lightgbm.within_2_dollars_pct - fare.baseline.within_2_dollars_pct).toFixed(1)}%</td>
      </tr>
      <tr style="border-top: 2px solid rgba(255,255,255,0.1);">
        <td><strong>Duration RMSE</strong></td>
        <td>${(dur.baseline.rmse / 60).toFixed(1)} min</td>
        <td style="color:#34d399;">${(dur.lightgbm.rmse / 60).toFixed(1)} min</td>
        <td style="color:#60a5fa; font-weight:700;">-${dur.improvement_pct.rmse_reduction}%</td>
      </tr>
      <tr>
        <td><strong>Duration R² Score</strong></td>
        <td>${dur.baseline.r2_score.toFixed(3)}</td>
        <td style="color:#34d399;">${dur.lightgbm.r2_score.toFixed(3)}</td>
        <td style="color:#60a5fa; font-weight:700;">+${((dur.lightgbm.r2_score - dur.baseline.r2_score)*100).toFixed(1)}% pts</td>
      </tr>
      <tr>
        <td><strong>Within 2 Mins Accuracy</strong></td>
        <td>${dur.baseline.within_2_mins_pct}%</td>
        <td style="color:#34d399;">${dur.lightgbm.within_2_mins_pct}%</td>
        <td style="color:#60a5fa; font-weight:700;">+${(dur.lightgbm.within_2_mins_pct - dur.baseline.within_2_mins_pct).toFixed(1)}%</td>
      </tr>
    `;
  }

  function renderFeatureImportance(importanceData) {
    const container = document.getElementById("importance-container");
    if (!container) return;

    const fareFeatures = importanceData.fare_model_top_features || {};
    const topEntries = Object.entries(fareFeatures).slice(0, 7);
    if (topEntries.length === 0) return;

    const maxScore = topEntries[0][1];
    container.innerHTML = "";

    topEntries.forEach(([feat, score]) => {
      const pct = Math.max(Math.round((score / maxScore) * 100), 4);
      const friendlyName = feat
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const item = document.createElement("div");
      item.className = "imp-item";
      item.innerHTML = `
        <div class="imp-label-row">
          <span>${friendlyName}</span>
          <span style="font-weight:600; color:#93c5fd;">${Math.round(score).toLocaleString()}</span>
        </div>
        <div class="imp-bar-track">
          <div class="imp-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function renderEdaSummary(eda) {
    if (!eda) return;
    const setText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    setText("eda-total-records", eda.total_records ? eda.total_records.toLocaleString() : "--");
    setText("eda-mean-fare", eda.mean_fare ? `$${eda.mean_fare.toFixed(2)}` : "--");
    setText("eda-mean-distance", eda.mean_distance_miles ? `${eda.mean_distance_miles} mi` : "--");
    setText("eda-peak-hour", eda.peak_pickup_hour !== undefined ? `${eda.peak_pickup_hour}:00 (Rush Hour)` : "--");
  }

  // Initial calls
  loadPresets();
  triggerEstimation();
});
