Skycast – Weather App

A clean weather app that shows current conditions and a 7-day forecast for any city. It uses the free Open-Meteo API, so no API key or backend is needed.

Features:


Search any city, with a list of matching places when the name is ambiguous
Current temperature, feels-like, humidity and wind
7-day forecast with high/low and chance of rain
Switch between °C and °F (wind switches between km/h and mph)
"Use my location" via the browser Geolocation API
Recent searches saved in localStorage, and the last place reopens on your next visit
Loading states and clear error messages (no results, network failure, blocked location)
Responsive layout with visible focus states


Tech stack:


HTML5
JavaScript (ES6+, fetch and async/await, no framework)
Bootstrap 5 for components (input group, buttons, list group, alerts)
Tailwind CSS (CDN) for layout utilities, with preflight disabled so it does not conflict with Bootstrap
Open-Meteo Geocoding and Forecast APIs
