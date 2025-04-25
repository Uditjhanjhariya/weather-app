const apiKey = "YOUR_API_KEY_HERE"; // Replace this with your API key from OpenWeatherMap

let searchHistory = [];
let isCelsius = true;
let favoriteCities = JSON.parse(localStorage.getItem('favoriteCities')) || [];

async function getWeather(city = null) {
  const weatherInfo = document.getElementById("weatherInfo");
  const cityInput = document.getElementById("cityInput");
  
  try {
    weatherInfo.innerHTML = '<div class="loading">Loading weather data...</div>';
    
    if (!city && cityInput.value.trim()) {
      city = cityInput.value.trim();
    }

    let url;
    if (!city) {
      try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset&hourly=temperature_2m,weather_code&timezone=auto`;
      } catch (geoError) {
        weatherInfo.innerHTML = `
          <div class="error-message">
            <p>${geoError.message}</p>
            <p>Please enter a city name in the search box above.</p>
          </div>
        `;
        return;
      }
    } else {
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('City not found');
      }
      
      const { latitude, longitude } = geoData.results[0];
      url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset&hourly=temperature_2m,weather_code&timezone=auto`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    const data = await response.json();
    
    if (data) {
      displayWeather(data, city);
      cityInput.value = '';
    } else {
      throw new Error('Weather data not found');
    }
  } catch (error) {
    console.error('Error:', error);
    weatherInfo.innerHTML = `
      <div class="error-message">
        <p>${error.message || 'Error fetching weather data. Please try again.'}</p>
      </div>
    `;
  }
}

function getWeatherIcon(code) {
  // Map weather codes to icons
  const icons = {
    0: '01d', // Clear sky
    1: '02d', // Mainly clear
    2: '03d', // Partly cloudy
    3: '04d', // Overcast
    45: '50d', // Foggy
    48: '50d', // Depositing rime fog
    51: '09d', // Light drizzle
    53: '09d', // Moderate drizzle
    55: '09d', // Dense drizzle
    61: '10d', // Slight rain
    63: '10d', // Moderate rain
    65: '10d', // Heavy rain
    71: '13d', // Slight snow
    73: '13d', // Moderate snow
    75: '13d', // Heavy snow
    77: '13d', // Snow grains
    80: '09d', // Slight rain showers
    81: '09d', // Moderate rain showers
    82: '09d', // Violent rain showers
    85: '13d', // Slight snow showers
    86: '13d', // Heavy snow showers
    95: '11d', // Thunderstorm
    96: '11d', // Thunderstorm with slight hail
    99: '11d'  // Thunderstorm with heavy hail
  };
  return icons[code] || '01d';
}

function convertTemp(temp) {
  return isCelsius ? temp : (temp * 9/5) + 32;
}

function getWeatherAnimation(code) {
  if (code >= 51 && code <= 55) return 'rain';
  if (code >= 61 && code <= 65) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 95 && code <= 99) return 'rain';
  if (code >= 1 && code <= 3) return 'cloud';
  return '';
}

function displayWeather(data, city) {
  const weatherInfo = document.getElementById("weatherInfo");
  const date = new Date();
  const timeString = date.toLocaleTimeString();
  const dateString = date.toLocaleDateString();
  
  const weatherAnimation = getWeatherAnimation(data.current.weather_code);
  
  const weatherInfoHTML = `
    <div class="weather-card">
      ${weatherAnimation ? `<div class="weather-animation ${weatherAnimation}"></div>` : ''}
      <div class="weather-header">
        <h2>${city || 'Current Location'}</h2>
        <button class="favorite-btn" onclick="toggleFavorite('${city}')">
          ${favoriteCities.includes(city) ? '★' : '☆'}
        </button>
      </div>
      <p class="date-time">${dateString} ${timeString}</p>
      <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/${getWeatherIcon(data.current.weather_code)}@2x.png" alt="weather icon" />
        <div class="temperature-container">
          <h3>${Math.round(convertTemp(data.current.temperature_2m))}°${isCelsius ? 'C' : 'F'}</h3>
          <div class="temp-range">
            <span class="high">H: ${Math.round(convertTemp(data.daily.temperature_2m_max[0]))}°${isCelsius ? 'C' : 'F'}</span>
            <span class="low">L: ${Math.round(convertTemp(data.daily.temperature_2m_min[0]))}°${isCelsius ? 'C' : 'F'}</span>
          </div>
        </div>
      </div>
      <div class="weather-details">
        <div class="detail">
          <span class="label">Humidity</span>
          <span class="value">${data.current.relative_humidity_2m}%</span>
        </div>
        <div class="detail">
          <span class="label">Wind</span>
          <span class="value">${data.current.wind_speed_10m} km/h</span>
        </div>
        <div class="detail">
          <span class="label">Sunrise</span>
          <span class="value">${new Date(data.daily.sunrise[0]).toLocaleTimeString()}</span>
        </div>
        <div class="detail">
          <span class="label">Sunset</span>
          <span class="value">${new Date(data.daily.sunset[0]).toLocaleTimeString()}</span>
        </div>
      </div>
      <div class="forecast">
        <h3>5-Day Forecast</h3>
        <div class="forecast-container">
          ${data.daily.time.slice(0, 5).map((time, index) => `
            <div class="forecast-day">
              <p>${new Date(time).toLocaleDateString('en-US', { weekday: 'short' })}</p>
              <img src="https://openweathermap.org/img/wn/${getWeatherIcon(data.daily.weather_code[index])}@2x.png" alt="weather icon" />
              <p>${Math.round(convertTemp(data.daily.temperature_2m_max[index]))}°${isCelsius ? 'C' : 'F'}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  weatherInfo.innerHTML = weatherInfoHTML;
}

function updateSearchHistory() {
  const historyContainer = document.getElementById("searchHistory");
  if (searchHistory.length > 0) {
    historyContainer.innerHTML = `
      <h3>Recent Searches</h3>
      <div class="history-list">
        ${searchHistory.map(city => `
          <button class="history-item" onclick="getWeather('${city}')">${city}</button>
        `).join('')}
      </div>
    `;
  } else {
    historyContainer.innerHTML = '';
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          switch(error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location access denied. Please allow location access in your browser settings or enter a city name.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable. Please enter a city name.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out. Please try again or enter a city name.'));
              break;
            default:
              reject(new Error('An unknown error occurred. Please enter a city name.'));
          }
        },
        { 
          timeout: 10000,
          enableHighAccuracy: true
        }
      );
    }
  });
}

function toggleFavorite(city) {
  const index = favoriteCities.indexOf(city);
  if (index === -1) {
    favoriteCities.push(city);
  } else {
    favoriteCities.splice(index, 1);
  }
  localStorage.setItem('favoriteCities', JSON.stringify(favoriteCities));
  if (city) {
    getWeather(city);
  }
}

function toggleUnit() {
  isCelsius = !isCelsius;
  const city = document.getElementById("cityInput").value.trim();
  if (city) {
    getWeather(city);
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = document.getElementById("cityInput").value.trim();
    if (city) {
      getWeather(city);
    }
  });
  
  // Add current location button
  const locationButton = document.createElement('button');
  locationButton.innerHTML = '📍 Current Location';
  locationButton.className = 'location-button';
  locationButton.onclick = () => getWeather();
  document.querySelector('.search-box').appendChild(locationButton);

  // Add unit toggle button
  const unitButton = document.createElement('button');
  unitButton.innerHTML = '°C/°F';
  unitButton.className = 'unit-button';
  unitButton.onclick = toggleUnit;
  document.querySelector('.search-box').appendChild(unitButton);

  // Display favorite cities if any
  if (favoriteCities.length > 0) {
    const favoritesContainer = document.createElement('div');
    favoritesContainer.className = 'favorites';
    favoritesContainer.innerHTML = `
      <h3>Favorites</h3>
      <div class="favorites-list">
        ${favoriteCities.map(city => `
          <button class="favorite-item" onclick="getWeather('${city}')">${city}</button>
        `).join('')}
      </div>
    `;
    document.querySelector('.container').insertBefore(favoritesContainer, document.querySelector('.weather-info'));
  }
});
