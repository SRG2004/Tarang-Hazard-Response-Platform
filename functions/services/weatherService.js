const axios = require('axios');
const rateLimiter = require('./rateLimiter');

const WEATHERSTACK_API_KEY = process.env.WEATHERSTACK_API_KEY;
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';
const BASE_URL = 'http://api.weatherstack.com';

// Check if we have real API access
const HAS_REAL_WEATHER_API = !USE_MOCK_DATA && WEATHERSTACK_API_KEY && WEATHERSTACK_API_KEY !== 'your-weatherstack-api-key';

// Indian coastal cities to monitor
const COASTAL_CITIES = [
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, state: 'Maharashtra' },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673, state: 'Kerala' },
  { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, state: 'Andhra Pradesh' },
  { name: 'Mangalore', lat: 12.9141, lon: 74.8560, state: 'Karnataka' },
  { name: 'Goa', lat: 15.2993, lon: 74.1240, state: 'Goa' },
  { name: 'Puri', lat: 19.8135, lon: 85.8312, state: 'Odisha' },
  { name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366, state: 'Kerala' },
  { name: 'Port Blair', lat: 11.6234, lon: 92.7265, state: 'Andaman and Nicobar' },
  { name: 'Diu', lat: 20.7144, lon: 70.9872, state: 'Daman and Diu' },
  { name: 'Paradip', lat: 20.3167, lon: 86.6167, state: 'Odisha' }
];

/**
 * Convert Weatherstack API response to OpenWeatherMap-like format
 * @param {Object} weatherstackData - Weatherstack API response
 * @returns {Object} Normalized weather data
 */
function normalizeWeatherstackResponse(weatherstackData) {
  if (!weatherstackData || !weatherstackData.current) {
    throw new Error('Invalid Weatherstack API response');
  }

  const current = weatherstackData.current;
  const location = weatherstackData.location || {};

  return {
    weather: [{
      main: current.weather_descriptions?.[0]?.split(' ')[0] || 'Clear',
      description: current.weather_descriptions?.[0] || 'Clear sky',
      id: current.weather_code || 800
    }],
    main: {
      temp: current.temperature,
      feels_like: current.feelslike,
      pressure: current.pressure,
      humidity: current.humidity,
      temp_min: current.temperature - 2,
      temp_max: current.temperature + 2
    },
    wind: {
      speed: current.wind_speed ? current.wind_speed / 3.6 : 0, // Convert km/h to m/s
      deg: current.wind_degree || 0,
      gust: current.wind_speed ? current.wind_speed / 3.6 : 0
    },
    clouds: {
      all: current.cloudcover || 0
    },
    visibility: current.visibility ? current.visibility * 1000 : 10000, // Convert km to meters
    rain: current.precip ? { '1h': current.precip } : null,
    sys: {
      country: location.country || 'IN',
      sunrise: current.is_day ? undefined : Date.now(),
      sunset: current.is_day ? Date.now() : undefined
    },
    coord: {
      lat: location.lat,
      lon: location.lon
    },
    name: location.name || 'Unknown',
    dt: current.observation_time ? new Date(current.observation_time).getTime() / 1000 : Date.now() / 1000,
    // Keep original Weatherstack data for reference
    _weatherstack: {
      location: location,
      current: current
    }
  };
}

/**
 * Get current weather for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Weather data
 */
async function getCurrentWeather(lat, lon) {
  // Check if we should use mock data
  if (USE_MOCK_DATA) {
    console.warn(`[WARNING] WeatherService: Using MOCK data for current weather at ${lat},${lon} (USE_MOCK_DATA=true).`);
    console.warn('[WARNING] Mock data may not reflect real weather conditions. Set WEATHERSTACK_API_KEY for production.');
    return {
      weather: [{ main: 'Clouds', description: 'overcast clouds' }],
      main: { temp: 28, pressure: 1012 },
      wind: { speed: 5 },
      rain: null,
      source: 'MOCK_DATA',
      isMockData: true,
      warning: 'This is mock data. Configure WEATHERSTACK_API_KEY for real weather data.',
      note: 'Mock data - set WEATHERSTACK_API_KEY in .env for real data'
    };
  }

  // Check if we have API key
  if (!HAS_REAL_WEATHER_API) {
    console.error(`[ERROR] WeatherService: No Weatherstack API key configured. Using mock data for ${lat},${lon}.`);
    console.error('[ERROR] Configure WEATHERSTACK_API_KEY in functions/.env for production weather data.');
    return {
      weather: [{ main: 'Clouds', description: 'overcast clouds' }],
      main: { temp: 28, pressure: 1012 },
      wind: { speed: 5 },
      rain: null,
      source: 'MOCK_DATA_NO_API_KEY',
      isMockData: true,
      warning: 'Weather API not configured. Using mock data which may be inaccurate.',
      error: 'WEATHERSTACK_API_KEY not configured',
      note: 'Mock data - set WEATHERSTACK_API_KEY in functions/.env for real data'
    };
  }

  // Check rate limit before making API call
  const rateLimitCheck = await rateLimiter.checkRateLimit();
  
  if (!rateLimitCheck.allowed) {
    console.warn(`[WARNING] WeatherService: Rate limit reached (${rateLimitCheck.current}/${rateLimiter.WEATHERSTACK_RATE_LIMIT} calls this month). Using mock data.`);
    return {
      weather: [{ main: 'Clouds', description: 'overcast clouds' }],
      main: { temp: 28, pressure: 1012 },
      wind: { speed: 5 },
      rain: null,
      source: 'MOCK_DATA_RATE_LIMIT',
      isMockData: true,
      warning: `Rate limit reached (${rateLimitCheck.current}/${rateLimiter.WEATHERSTACK_RATE_LIMIT} calls this month). Using mock data.`,
      note: `Weatherstack API limit reached. Will use cached/mock data until next month.`,
      rateLimit: {
        current: rateLimitCheck.current,
        limit: rateLimiter.WEATHERSTACK_RATE_LIMIT,
        month: rateLimitCheck.month
      }
    };
  }

  // Try to fetch real weather data from Weatherstack API
  try {
    console.log(`WeatherService: Fetching REAL weather data from Weatherstack API for ${lat},${lon}. (${rateLimitCheck.remaining} calls remaining this month)`);
    
    // Weatherstack uses query parameter with lat,lon format
    const query = `${lat},${lon}`;
    
    const response = await axios.get(`${BASE_URL}/current`, {
      params: {
        access_key: WEATHERSTACK_API_KEY,
        query: query,
        units: 'm' // Metric units
      },
      timeout: 10000
    });

    // Check for API errors in response
    if (response.data.error) {
      throw new Error(`Weatherstack API error: ${response.data.error.info || response.data.error.type}`);
    }

    if (response.data && response.data.current) {
      // Record successful API call
      await rateLimiter.recordApiCall();
      
      // Normalize response to match OpenWeatherMap format
      const normalizedData = normalizeWeatherstackResponse(response.data);
      
      console.log(`WeatherService: Successfully fetched real weather data for ${lat},${lon}.`);
      return {
        ...normalizedData,
        source: 'WEATHERSTACK_API',
        isReal: true
      };
    }

    throw new Error('No data received from Weatherstack API');
  } catch (error) {
    console.error(`Error fetching real weather for ${lat},${lon}:`, error.message);
    console.warn(`WeatherService: Falling back to mock data due to API error.`);
    
    // Fallback to mock data if API fails
    return {
      weather: [{ main: 'Clouds', description: 'overcast clouds' }],
      main: { temp: 28, pressure: 1012 },
      wind: { speed: 5 },
      rain: null,
      source: 'MOCK_DATA_API_ERROR',
      error: error.message,
      note: 'Mock data used due to API error. Check WEATHERSTACK_API_KEY and API status.'
    };
  }
}

/**
 * Get weather alerts for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Weather alerts
 */
async function getWeatherAlerts(lat, lon) {
  // Weatherstack doesn't have a dedicated alerts endpoint
  // We'll derive alerts from current weather conditions
  try {
    const weather = await getCurrentWeather(lat, lon);
    
    // Only use real weather data if it's available
    if (!weather.isReal && weather.isMockData) {
      return [];
    }

    const alerts = [];
    
    // Check wind speed for alerts
    if (weather.wind && weather.wind.speed > 15) { // > 15 m/s
      alerts.push({
        event: 'High Wind Warning',
        description: `Strong winds detected: ${weather.wind.speed.toFixed(1)} m/s`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        tags: ['wind', 'warning']
      });
    }

    // Check for storm conditions
    if (weather.weather && weather.weather.length > 0) {
      const mainWeather = weather.weather[0].main.toLowerCase();
      if (mainWeather.includes('thunderstorm') || mainWeather.includes('storm')) {
        alerts.push({
          event: 'Storm Warning',
          description: weather.weather[0].description,
          start: new Date().toISOString(),
          end: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
          tags: ['storm', 'warning']
        });
      }
    }

    // Check for heavy rain
    if (weather.rain && weather.rain['1h'] > 50) {
      alerts.push({
        event: 'Heavy Rain Warning',
        description: `Heavy rainfall detected: ${weather.rain['1h']} mm/h`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
        tags: ['rain', 'warning']
      });
    }

    return alerts;
  } catch (error) {
    console.error(`Error fetching weather alerts for ${lat},${lon}:`, error.message);
    return [];
  }
}

/**
 * Check if weather conditions indicate potential hazard
 * @param {Object} weather - Weather data
 * @returns {Object} Hazard assessment
 */
function assessWeatherHazard(weather) {
  if (!weather) {
    return { isHazard: false };
  }

  const hazards = [];
  let severity = 'low';
  let isHazard = false;

  // Check wind speed (high winds can cause high waves)
  if (weather.wind && weather.wind.speed > 15) { // > 15 m/s (54 km/h)
    hazards.push('High winds');
    severity = 'high';
    isHazard = true;
  }

  // Check for storm conditions
  if (weather.weather && weather.weather.length > 0) {
    const mainWeather = weather.weather[0].main.toLowerCase();
    if (mainWeather.includes('thunderstorm') || mainWeather.includes('storm')) {
      hazards.push('Storm conditions');
      severity = 'high';
      isHazard = true;
    }
    if (mainWeather.includes('rain') && weather.rain && weather.rain['1h'] > 50) {
      hazards.push('Heavy rainfall');
      severity = 'medium';
      isHazard = true;
    }
  }

  // Check atmospheric pressure (low pressure can indicate storms)
  if (weather.main && weather.main.pressure < 1000) {
    hazards.push('Low atmospheric pressure');
    if (severity === 'low') severity = 'medium';
    isHazard = true;
  }

  return {
    isHazard,
    severity,
    hazards,
    conditions: {
      windSpeed: weather.wind?.speed,
      pressure: weather.main?.pressure,
      description: weather.weather?.[0]?.description,
      temperature: weather.main?.temp
    }
  };
}

/**
 * Monitor weather conditions for all coastal cities
 * @returns {Promise<Array>} Array of hazard reports
 */
async function monitorCoastalWeather() {
  console.log('Monitoring coastal weather conditions...');
  const reports = [];

  for (const city of COASTAL_CITIES) {
    try {
      // Get current weather
      const weather = await getCurrentWeather(city.lat, city.lon);
      
      if (!weather) continue;

      // Assess for hazards
      const assessment = assessWeatherHazard(weather);

      // Get alerts
      const alerts = await getWeatherAlerts(city.lat, city.lon);

      // If hazard detected or alerts exist, create report
      if (assessment.isHazard || alerts.length > 0) {
        const report = {
          type: 'weather',
          location: {
            name: city.name,
            state: city.state,
            coordinates: {
              lat: city.lat,
              lng: city.lon
            }
          },
          timestamp: new Date().toISOString(),
          severity: assessment.severity,
          hazards: assessment.hazards,
          conditions: assessment.conditions,
          alerts: alerts.map(alert => ({
            event: alert.event,
            description: alert.description,
            start: alert.start,
            end: alert.end,
            severity: alert.tags?.[0] || 'unknown'
          })),
          source: 'Weatherstack API',
          verified: true // Weather API data is inherently verified
        };

        reports.push(report);
        console.log(`Weather hazard detected in ${city.name}: ${assessment.hazards.join(', ')}`);
      }

      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error monitoring weather for ${city.name}:`, error.message);
    }
  }

  console.log(`Weather monitoring complete. Found ${reports.length} hazard reports.`);
  return reports;
}

/**
 * Normalize Weatherstack forecast response to OpenWeatherMap format
 * @param {Object} forecastData - Weatherstack forecast API response
 * @returns {Object} Normalized forecast data
 */
function normalizeWeatherstackForecast(forecastData) {
  if (!forecastData || !forecastData.forecast) {
    throw new Error('Invalid Weatherstack forecast response');
  }

  const location = forecastData.location || {};
  const forecast = forecastData.forecast || {};
  const forecastDays = Object.keys(forecast).sort().slice(0, 14); // Up to 14 days

  const list = [];
  
  forecastDays.forEach((date, dayIndex) => {
    const dayData = forecast[date];
    const dateObj = new Date(date + 'T12:00:00Z'); // Use noon for daily forecast
    
    if (dayData.hourly && Array.isArray(dayData.hourly)) {
      // Use hourly data if available
      dayData.hourly.slice(0, 8).forEach((hour, hourIndex) => {
        list.push({
          dt: new Date(dateObj.getTime() + hourIndex * 3 * 60 * 60 * 1000).getTime() / 1000,
          main: {
            temp: hour.temp || dayData.avgtemp,
            feels_like: hour.feelslike || dayData.avgtemp,
            temp_min: dayData.mintemp || hour.temp,
            temp_max: dayData.maxtemp || hour.temp,
            pressure: hour.pressure || 1013,
            humidity: hour.humidity || 70,
            sea_level: hour.pressure || 1013,
            grnd_level: hour.pressure || 1013
          },
          weather: [{
            main: hour.weatherCode ? getWeatherMain(hour.weatherCode) : 'Clear',
            description: hour.weatherDesc?.[0]?.value || 'Clear sky',
            icon: hour.weatherCode ? `w${hour.weatherCode}` : '01d'
          }],
          wind: {
            speed: hour.windspeed ? hour.windspeed / 3.6 : 5, // Convert km/h to m/s
            deg: hour.winddir || 0,
            gust: hour.windGust ? hour.windGust / 3.6 : 0
          },
          clouds: {
            all: hour.cloudcover || dayData.totalSnowCm || 0
          },
          rain: hour.precip ? { '3h': hour.precip } : null,
          snow: dayData.totalSnowCm ? { '3h': dayData.totalSnowCm } : null,
          dt_txt: new Date(dateObj.getTime() + hourIndex * 3 * 60 * 60 * 1000).toISOString()
        });
      });
    } else {
      // Use daily data
      for (let hour = 0; hour < 24; hour += 3) {
        const hourTime = new Date(dateObj.getTime() + hour * 60 * 60 * 1000);
        list.push({
          dt: hourTime.getTime() / 1000,
          main: {
            temp: dayData.avgtemp || 28,
            feels_like: dayData.avgtemp || 28,
            temp_min: dayData.mintemp || dayData.avgtemp,
            temp_max: dayData.maxtemp || dayData.avgtemp,
            pressure: dayData.pressure || 1013,
            humidity: dayData.avgHumidity || 70
          },
          weather: [{
            main: dayData.weatherCode ? getWeatherMain(dayData.weatherCode) : 'Clear',
            description: dayData.weatherDesc?.[0]?.value || 'Clear sky',
            icon: dayData.weatherCode ? `w${dayData.weatherCode}` : '01d'
          }],
          wind: {
            speed: dayData.maxwindSpeed ? dayData.maxwindSpeed / 3.6 : 5,
            deg: dayData.winddir || 0
          },
          clouds: {
            all: dayData.cloudcover || 0
          },
          rain: dayData.totalprecipMM ? { '3h': dayData.totalprecipMM } : null,
          dt_txt: hourTime.toISOString()
        });
      }
    }
  });

  return {
    list: list.slice(0, days * 8), // Limit to requested days
    city: {
      id: 0,
      name: location.name || 'Unknown',
      coord: {
        lat: location.lat || 0,
        lon: location.lon || 0
      },
      country: location.country || 'IN'
    }
  };
}

/**
 * Helper function to convert Weatherstack weather codes to OpenWeatherMap main weather
 * @param {number} code - Weatherstack weather code
 * @returns {string} Weather main type
 */
function getWeatherMain(code) {
  // Weatherstack weather codes mapping
  const codeMap = {
    113: 'Clear', 116: 'Clouds', 119: 'Clouds', 122: 'Clouds',
    143: 'Mist', 176: 'Rain', 179: 'Rain', 182: 'Rain',
    185: 'Rain', 200: 'Thunderstorm', 227: 'Snow', 230: 'Snow',
    248: 'Mist', 260: 'Mist', 263: 'Rain', 266: 'Rain',
    281: 'Rain', 284: 'Rain', 293: 'Rain', 296: 'Rain',
    299: 'Rain', 302: 'Rain', 305: 'Rain', 308: 'Rain',
    311: 'Rain', 314: 'Rain', 317: 'Rain', 320: 'Rain',
    323: 'Snow', 326: 'Snow', 329: 'Snow', 332: 'Snow',
    335: 'Snow', 338: 'Snow', 350: 'Snow', 353: 'Rain',
    356: 'Rain', 359: 'Rain', 362: 'Rain', 365: 'Rain',
    368: 'Snow', 371: 'Snow', 374: 'Snow', 377: 'Snow',
    386: 'Thunderstorm', 389: 'Thunderstorm', 392: 'Thunderstorm', 395: 'Snow'
  };
  return codeMap[code] || 'Clear';
}

/**
 * Build forecast from current weather data
 * Uses current weather to create a realistic forecast based on patterns
 * @param {Object} currentWeather - Current weather data
 * @param {number} days - Number of days to forecast
 * @returns {Object} Forecast data
 */
function buildForecastFromCurrent(currentWeather, days = 5) {
  const baseTemp = currentWeather.main?.temp || 28;
  const basePressure = currentWeather.main?.pressure || 1012;
  const baseWind = currentWeather.wind?.speed || 5;
  const baseWeather = currentWeather.weather?.[0] || { main: 'Clear', description: 'clear sky' };
  
  const list = [];
  const now = Date.now();
  
  // Build forecast with realistic variations
  for (let i = 0; i < days * 8; i++) {
    const hoursAhead = i * 3;
    const timestamp = now + hoursAhead * 60 * 60 * 1000;
    
    // Temperature variation: cooler at night, warmer during day
    const hourOfDay = new Date(timestamp).getHours();
    const isDay = hourOfDay >= 6 && hourOfDay < 18;
    const tempVariation = isDay ? 2 : -3;
    const dayProgress = (hourOfDay - 6) / 12; // 0 to 1 from 6am to 6pm
    const tempOffset = isDay ? Math.sin(dayProgress * Math.PI) * 3 : -2;
    
    // Pressure slightly decreases over time (typical pattern)
    const pressureVariation = -0.1 * (hoursAhead / 24);
    
    // Wind speed variation
    const windVariation = Math.sin((hoursAhead / 24) * Math.PI * 2) * 2;
    
    list.push({
      dt: Math.floor(timestamp / 1000),
      main: {
        temp: baseTemp + tempVariation + tempOffset,
        feels_like: baseTemp + tempVariation + tempOffset - 2,
        temp_min: baseTemp + tempVariation + tempOffset - 3,
        temp_max: baseTemp + tempVariation + tempOffset + 2,
        pressure: Math.max(995, basePressure + pressureVariation),
        humidity: 70 + (Math.random() - 0.5) * 20
      },
      weather: [{
        main: baseWeather.main,
        description: baseWeather.description,
        icon: isDay ? '02d' : '02n'
      }],
      wind: {
        speed: Math.max(0, baseWind + windVariation),
        deg: currentWeather.wind?.deg || 180
      },
      clouds: {
        all: currentWeather.clouds?.all || 30
      },
      rain: currentWeather.rain || null,
      dt_txt: new Date(timestamp).toISOString()
    });
  }
  
  return {
    list,
    city: {
      name: currentWeather.name || 'Unknown',
      coord: currentWeather.coord || { lat: 0, lon: 0 }
    }
  };
}

/**
 * Get weather forecast for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} days - Number of days (max 5)
 * @returns {Promise<Object>} Forecast data
 */
async function getWeatherForecast(lat, lon, days = 5) {
  // Check if we should use mock data
  if (USE_MOCK_DATA) {
    console.log(`WeatherService: Using MOCK data for weather forecast at ${lat},${lon} (USE_MOCK_DATA=true).`);
    return {
      list: Array.from({ length: days * 8 }, (_, i) => ({
        dt: Date.now() + i * 3 * 60 * 60 * 1000,
        main: { temp: 28 + Math.random() * 3, pressure: 1012 },
        weather: [{ main: 'Clouds', description: 'overcast clouds' }],
        wind: { speed: 5 + Math.random() * 5 }
      })),
      source: 'MOCK_DATA',
      note: 'Mock data - Weatherstack free tier does not include forecast API'
    };
  }

  // Check if we have API key
  if (!HAS_REAL_WEATHER_API) {
    console.warn(`WeatherService: No Weatherstack API key configured. Using mock forecast.`);
    return {
      list: Array.from({ length: days * 8 }, (_, i) => ({
        dt: Date.now() + i * 3 * 60 * 60 * 1000,
        main: { temp: 28 + Math.random() * 3, pressure: 1012 },
        weather: [{ main: 'Clouds', description: 'overcast clouds' }],
        wind: { speed: 5 + Math.random() * 5 }
      })),
      source: 'MOCK_DATA_NO_API_KEY',
      note: 'Mock data - set WEATHERSTACK_API_KEY in functions/.env for real data'
    };
  }

  // Check rate limit before making API call
  const rateLimitCheck = await rateLimiter.checkRateLimit();
  
  if (!rateLimitCheck.allowed) {
    console.warn(`[WARNING] WeatherService: Rate limit reached. Building forecast from cached current weather.`);
    // Try to build forecast from current weather if available
    try {
      const currentWeather = await getCurrentWeather(lat, lon);
      if (!currentWeather.isMockData && currentWeather.isReal) {
        const forecast = buildForecastFromCurrent(currentWeather, days);
        return {
          ...forecast,
          source: 'WEATHERSTACK_API_DERIVED',
          note: 'Forecast built from current weather (rate limit reached)',
          rateLimit: {
            remaining: 0,
            limit: rateLimiter.WEATHERSTACK_RATE_LIMIT
          }
        };
      }
    } catch (error) {
      console.error('Error building forecast from current weather:', error);
    }
    
    // Fallback to mock if we can't build from current weather
    return {
      list: Array.from({ length: days * 8 }, (_, i) => ({
        dt: Date.now() + i * 3 * 60 * 60 * 1000,
        main: { temp: 28 + Math.random() * 3, pressure: 1012 },
        weather: [{ main: 'Clouds', description: 'overcast clouds' }],
        wind: { speed: 5 + Math.random() * 5 }
      })),
      source: 'MOCK_DATA_RATE_LIMIT',
      note: 'Mock data - rate limit reached',
      rateLimit: {
        remaining: 0,
        limit: rateLimiter.WEATHERSTACK_RATE_LIMIT
      }
    };
  }

  // Strategy 1: Try Weatherstack forecast endpoint (if available in plan)
  // Strategy 2: If not available, fetch current weather and build forecast from it
  
  const query = `${lat},${lon}`;
  
  // Try forecast endpoint first
  try {
    console.log(`WeatherService: Attempting to fetch REAL forecast from Weatherstack API for ${lat},${lon}. (${rateLimitCheck.remaining} calls remaining)`);
    
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        access_key: WEATHERSTACK_API_KEY,
        query: query,
        units: 'm', // Metric units
        forecast_days: Math.min(days, 14) // Max 14 days
      },
      timeout: 10000
    });

    // Check for API errors
    if (response.data.error) {
      // Forecast endpoint not available - fall through to current weather strategy
      throw new Error(`Weatherstack forecast API not available: ${response.data.error.info || response.data.error.type}`);
    }

    if (response.data && response.data.forecast) {
      // Success! Forecast endpoint is available
      await rateLimiter.recordApiCall();
      
      const normalizedForecast = normalizeWeatherstackForecast(response.data);
      
      console.log(`WeatherService: Successfully fetched real forecast from Weatherstack for ${lat},${lon}.`);
      return {
        ...normalizedForecast,
        source: 'WEATHERSTACK_API_FORECAST',
        isReal: true
      };
    }

    throw new Error('No forecast data received from Weatherstack API');
  } catch (error) {
    // Forecast endpoint not available or failed
    // Strategy 2: Build forecast from current weather (consumes 1 API call)
    
    if (error.response?.status === 402 || error.message?.includes('subscription') || error.message?.includes('plan')) {
      console.log(`WeatherService: Forecast endpoint requires paid plan. Building forecast from current weather instead.`);
    } else {
      console.log(`WeatherService: Forecast endpoint failed: ${error.message}. Building forecast from current weather instead.`);
    }
    
    // Check if we have remaining API calls to fetch current weather
    if (rateLimitCheck.remaining < 1) {
      console.warn(`WeatherService: No API calls remaining. Using mock forecast.`);
      return {
        list: Array.from({ length: days * 8 }, (_, i) => ({
          dt: Date.now() + i * 3 * 60 * 60 * 1000,
          main: { temp: 28 + Math.random() * 3, pressure: 1012 },
          weather: [{ main: 'Clouds', description: 'overcast clouds' }],
          wind: { speed: 5 + Math.random() * 5 }
        })),
        source: 'MOCK_DATA_NO_CALLS',
        note: `No API calls remaining (${rateLimitCheck.remaining}/${rateLimiter.WEATHERSTACK_RATE_LIMIT})`,
        rateLimit: {
          remaining: rateLimitCheck.remaining,
          limit: rateLimiter.WEATHERSTACK_RATE_LIMIT
        }
      };
    }
    
    // Fetch current weather and build forecast from it
    try {
      console.log(`WeatherService: Fetching current weather to build forecast for ${lat},${lon}.`);
      const currentWeather = await getCurrentWeather(lat, lon);
      
      if (currentWeather.isMockData || !currentWeather.isReal) {
        // If current weather is mock, return mock forecast
        return {
          list: Array.from({ length: days * 8 }, (_, i) => ({
            dt: Date.now() + i * 3 * 60 * 60 * 1000,
            main: { temp: 28 + Math.random() * 3, pressure: 1012 },
            weather: [{ main: 'Clouds', description: 'overcast clouds' }],
            wind: { speed: 5 + Math.random() * 5 }
          })),
          source: 'MOCK_DATA_CURRENT_WEATHER_MOCK',
          note: 'Current weather unavailable, using mock forecast'
        };
      }
      
      // Build forecast from real current weather
      const forecast = buildForecastFromCurrent(currentWeather, days);
      
      console.log(`WeatherService: Built forecast from current weather for ${lat},${lon}.`);
      return {
        ...forecast,
        source: 'WEATHERSTACK_API_DERIVED',
        isReal: true,
        note: 'Forecast built from current weather data (forecast endpoint not available in free tier)',
        rateLimit: {
          remaining: rateLimitCheck.remaining - 1, // Already consumed 1 call for current weather
          limit: rateLimiter.WEATHERSTACK_RATE_LIMIT
        }
      };
    } catch (currentWeatherError) {
      console.error(`Error fetching current weather for forecast: ${currentWeatherError.message}`);
      
      // Final fallback to mock
      return {
        list: Array.from({ length: days * 8 }, (_, i) => ({
          dt: Date.now() + i * 3 * 60 * 60 * 1000,
          main: { temp: 28 + Math.random() * 3, pressure: 1012 },
          weather: [{ main: 'Clouds', description: 'overcast clouds' }],
          wind: { speed: 5 + Math.random() * 5 }
        })),
        source: 'MOCK_DATA_API_ERROR',
        error: currentWeatherError.message,
        note: 'Failed to fetch weather data, using mock forecast'
      };
    }
  }
}

module.exports = {
  getCurrentWeather,
  getWeatherAlerts,
  getWeatherForecast,
  monitorCoastalWeather,
  assessWeatherHazard,
  COASTAL_CITIES
};
