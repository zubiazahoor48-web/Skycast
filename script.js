"use strict";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const RECENT_KEY = "skycast.recent.v1";
const PLACE_KEY = "skycast.place.v1";

// WMO weather codes -> label + emoji
const WEATHER = {
  0: ["Clear sky", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Freezing fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌦️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"], 86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Thunderstorm with hail", "⛈️"],
};
const describe = (code) => WEATHER[code] || ["Unknown", "🌡️"];

const $ = (sel) => document.querySelector(sel);
const escapeHTML = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let place = readJSON(PLACE_KEY, null);
let recent = readJSON(RECENT_KEY, []);

/* ---------- Helpers ---------- */
function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
const unit = () => document.querySelector('input[name="unit"]:checked').value;

function showError(msg) {
  const box = $("#error");
  box.textContent = msg;
  box.classList.toggle("d-none", !msg);
}
function setStatus(msg) {
  $("#status").textContent = msg;
}
function hideResults() {
  $("#current").classList.add("d-none");
  $("#forecastWrap").classList.add("d-none");
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/* ---------- Search ---------- */
$("#searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#city").value.trim();
  if (!name) return;
  showError("");
  setStatus("Searching…");
  $("#suggestions").classList.add("d-none");
  try {
    const data = await getJSON(`${GEO_URL}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`);
    const results = data.results || [];
    setStatus("");
    if (!results.length) return showError(`No places found for "${name}". Check the spelling and try again.`);
    const places = results.map((r) => ({
      name: r.name,
      detail: [r.admin1, r.country].filter(Boolean).join(", "),
      lat: r.latitude,
      lon: r.longitude,
    }));
    if (places.length === 1) return selectPlace(places[0]);
    showSuggestions(places);
  } catch (err) {
    setStatus("");
    showError("Could not search right now. Check your internet connection and try again.");
  }
});

function showSuggestions(places) {
  const box = $("#suggestions");
  box.innerHTML = places
    .map(
      (p, i) => `<button type="button" class="list-group-item list-group-item-action" data-i="${i}">
        <strong>${escapeHTML(p.name)}</strong> <span class="text-secondary">${escapeHTML(p.detail)}</span></button>`
    )
    .join("");
  box.classList.remove("d-none");
  box.onclick = (e) => {
    const btn = e.target.closest("[data-i]");
    if (btn) {
      box.classList.add("d-none");
      selectPlace(places[btn.dataset.i]);
    }
  };
}

function selectPlace(p) {
  place = p;
  localStorage.setItem(PLACE_KEY, JSON.stringify(p));
  if (p.name !== "Your location") {
    recent = [p, ...recent.filter((r) => r.name !== p.name || r.detail !== p.detail)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    renderRecent();
  }
  loadWeather();
}

function renderRecent() {
  $("#recent").innerHTML = recent
    .map((p, i) => `<button type="button" class="chip" data-i="${i}">${escapeHTML(p.name)}</button>`)
    .join("");
}
$("#recent").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-i]");
  if (btn) selectPlace(recent[btn.dataset.i]);
});

/* ---------- Geolocation ---------- */
$("#geoBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return showError("Your browser does not support location access.");
  showError("");
  setStatus("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setStatus("");
      selectPlace({ name: "Your location", detail: "", lat: pos.coords.latitude, lon: pos.coords.longitude });
    },
    () => {
      setStatus("");
      showError("Location access was blocked. Search for a city instead, or allow location in your browser.");
    }
  );
});

/* ---------- Weather ---------- */
async function loadWeather() {
  if (!place) return;
  const f = unit() === "f";
  const params = new URLSearchParams({
    latitude: place.lat,
    longitude: place.lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    temperature_unit: f ? "fahrenheit" : "celsius",
    wind_speed_unit: f ? "mph" : "kmh",
  });
  showError("");
  setStatus("Loading weather…");
  try {
    const data = await getJSON(`${FORECAST_URL}?${params}`);
    setStatus("");
    renderWeather(data, f);
  } catch (err) {
    setStatus("");
    hideResults();
    showError("Could not load the forecast. Check your internet connection and try again.");
  }
}

function renderWeather(data, f) {
  const c = data.current;
  const [label, emoji] = describe(c.weather_code);
  const deg = f ? "°F" : "°C";

  $("#placeName").textContent = place.detail ? `${place.name}, ${place.detail}` : place.name;
  $("#temp").textContent = `${Math.round(c.temperature_2m)}${deg}`;
  $("#desc").textContent = label;
  $("#icon").textContent = emoji;
  $("#feels").textContent = `${Math.round(c.apparent_temperature)}${deg}`;
  $("#humidity").textContent = `${c.relative_humidity_2m}%`;
  $("#wind").textContent = `${Math.round(c.wind_speed_10m)} ${f ? "mph" : "km/h"}`;

  const d = data.daily;
  $("#forecast").innerHTML = d.time
    .map((date, i) => {
      const [dayLabel, dayEmoji] = describe(d.weather_code[i]);
      const name = i === 0 ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" });
      return `<div class="day" title="${dayLabel}">
        <div class="name">${name}</div>
        <div class="ico" aria-hidden="true">${dayEmoji}</div>
        <div><span class="hi">${Math.round(d.temperature_2m_max[i])}°</span> <span class="lo">${Math.round(d.temperature_2m_min[i])}°</span></div>
        <div class="rain">${d.precipitation_probability_max[i] ?? 0}% rain</div>
      </div>`;
    })
    .join("");

  $("#current").classList.remove("d-none");
  $("#forecastWrap").classList.remove("d-none");
}

document.querySelectorAll('input[name="unit"]').forEach((r) => r.addEventListener("change", loadWeather));

/* ---------- Init ---------- */
renderRecent();
if (place) loadWeather();
else setStatus("Search for a city to see its forecast.");