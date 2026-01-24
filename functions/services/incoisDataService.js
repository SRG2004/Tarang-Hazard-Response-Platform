const axios = require('axios');
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * INCOIS Data Service
 * Scrapes and integrates data from INCOIS (Indian National Centre for Ocean Information Services)
 * 
 * INCOIS provides:
 * - Ocean state forecasts (waves, currents, temperature)
 * - Tsunami early warnings
 * - Potential Fishing Zone (PFZ) advisories
 * - Ocean color data
 * - Sea level data
 * - Cyclone tracking
 */

// INCOIS API endpoints - Real data sources
const INCOIS_BASE_URL = process.env.INCOIS_BASE_URL || 'https://incois.gov.in';
const ERDDAP_BASE_URL = process.env.ERDDAP_BASE_URL || 'https://erddap.incois.gov.in/erddap';
const TSUNAMI_BASE_URL = process.env.TSUNAMI_BASE_URL || 'https://tsunami.incois.gov.in';
const HF_RADAR_URL = process.env.HF_RADAR_URL || 'https://services.incois.gov.in/hfradar';
const ARGO_DATA_URL = process.env.ARGO_DATA_URL || 'https://services.incois.gov.in/argo';

// Indian coastal regions for monitoring
const COASTAL_REGIONS = [
  { name: 'West Coast', states: ['Gujarat', 'Maharashtra', 'Goa', 'Karnataka', 'Kerala'] },
  { name: 'East Coast', states: ['Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal'] },
  { name: 'Islands', states: ['Andaman and Nicobar', 'Lakshadweep'] }
];

/**
 * Fetch ocean state forecast from INCOIS ERDDAP or OSF portal
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Ocean state data
 */
async function fetchOceanStateForecast(lat, lon) {
  try {
    // Try ERDDAP API first (REST API with JSON support)
    try {
      // ERDDAP API for wave forecast dataset
      const erddapUrl = `${ERDDAP_BASE_URL}/tabledap/WaveForecast_5day.json`;
      const response = await axios.get(erddapUrl, {
        params: {
          time: new Date().toISOString().split('T')[0],
          latitude: `${lat - 0.1},${lat + 0.1}`,
          longitude: `${lon - 0.1},${lon + 0.1}`,
          orderBy: 'time'
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.table && response.data.table.rows) {
        const rows = response.data.table.rows;
        if (rows.length > 0) {
          const latest = rows[rows.length - 1];
          const columns = response.data.table.columnNames;
          
          const getValue = (colName) => {
            const idx = columns.indexOf(colName);
            return idx >= 0 ? parseFloat(latest[idx]) : null;
          };

          return {
            waveHeight: getValue('waveHeight') || getValue('hs'),
            waveDirection: getValue('waveDirection') || getValue('dir'),
            seaSurfaceTemp: getValue('seaSurfaceTemp') || getValue('sst'),
            currentSpeed: getValue('currentSpeed') || getValue('u') || getValue('v'),
            currentDirection: getValue('currentDirection') || getValue('direction'),
            windSpeed: getValue('windSpeed') || getValue('ws'),
            windDirection: getValue('windDirection') || getValue('wd'),
            timestamp: new Date().toISOString(),
            source: 'INCOIS_ERDDAP',
            dataUrl: erddapUrl
          };
        }
      }
    } catch (erddapError) {
      console.warn('ERDDAP API failed, trying OSF portal:', erddapError.message);
    }

    // Fallback: Try OSF portal (HTML scraping or API if available)
    try {
      const osfUrl = `${INCOIS_BASE_URL}/portal/osf/osf.jsp`;
      const response = await axios.get(osfUrl, {
        params: {
          lat: lat.toFixed(4),
          lon: lon.toFixed(4)
        },
        timeout: 10000
      });

      // Parse HTML or JSON response from OSF portal
      // This may require HTML parsing if it's not JSON
      if (typeof response.data === 'string') {
        // Extract data from HTML if needed (basic parsing)
        // For now, return structure for future parsing
        return {
          waveHeight: null,
          waveDirection: null,
          seaSurfaceTemp: null,
          currentSpeed: null,
          currentDirection: null,
          windSpeed: null,
          windDirection: null,
          timestamp: new Date().toISOString(),
          source: 'INCOIS_OSF',
          rawData: response.data.substring(0, 500), // First 500 chars for debugging
          note: 'HTML response - needs parsing implementation'
        };
      }

      // If JSON response
      return {
        waveHeight: parseFloat(response.data.waveHeight) || null,
        waveDirection: parseFloat(response.data.waveDirection) || null,
        seaSurfaceTemp: parseFloat(response.data.sst) || null,
        currentSpeed: parseFloat(response.data.currentSpeed) || null,
        currentDirection: parseFloat(response.data.currentDirection) || null,
        windSpeed: parseFloat(response.data.windSpeed) || null,
        windDirection: parseFloat(response.data.windDirection) || null,
        timestamp: new Date().toISOString(),
        source: 'INCOIS_OSF'
      };
    } catch (osfError) {
      console.warn('OSF portal failed:', osfError.message);
    }

    // If all APIs fail, throw error
    throw new Error('All INCOIS data sources failed');
  } catch (error) {
    console.error('Error fetching INCOIS ocean state forecast:', error.message);
    // Return mock data only if all real sources fail
    console.error('[ERROR] INCOIS Data Service: All real data sources failed. Using mock data as fallback.');
    console.error('[ERROR] Mock data may not reflect real ocean conditions. Check INCOIS API availability.');
    return {
      waveHeight: 1.5 + Math.random() * 2,
      waveDirection: Math.random() * 360,
      seaSurfaceTemp: 28 + Math.random() * 3,
      currentSpeed: 0.5 + Math.random() * 1,
      currentDirection: Math.random() * 360,
      windSpeed: 5 + Math.random() * 10,
      windDirection: Math.random() * 360,
      timestamp: new Date().toISOString(),
      source: 'INCOIS_MOCK_FALLBACK',
      isMockData: true,
      warning: 'INCOIS data unavailable. Using mock fallback which may be inaccurate.',
      error: 'All INCOIS data sources failed'
    };
  }
}

/**
 * Fetch tsunami early warning data from INCOIS
 * @returns {Promise<Object>} Tsunami warning data
 */
async function fetchTsunamiWarnings() {
  try {
    // INCOIS Tsunami Early Warning System (ITEWS)
    // Try the early warnings endpoint
    const warningsUrl = `${TSUNAMI_BASE_URL}/TEWS/searlywarnings.jsp`;
    
    const response = await axios.get(warningsUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json, text/html'
      }
    });

    // Parse response (may be HTML or JSON)
    let warnings = [];
    let lastUpdate = new Date().toISOString();

    if (typeof response.data === 'string') {
      // HTML response - extract warning information
      // Look for warning indicators in HTML
      const warningMatches = response.data.match(/warning|alert|tsunami/gi);
      if (warningMatches && warningMatches.length > 0) {
        // Basic parsing - can be enhanced with proper HTML parsing
        warnings = [{ status: 'active', type: 'tsunami_warning' }];
      }
    } else if (Array.isArray(response.data)) {
      warnings = response.data;
    } else if (response.data.warnings) {
      warnings = response.data.warnings;
      lastUpdate = response.data.lastUpdate || lastUpdate;
    } else if (response.data.data) {
      warnings = response.data.data;
      lastUpdate = response.data.lastUpdate || lastUpdate;
    }

    // Also try the data archive endpoint for more details
    try {
      const archiveUrl = `${TSUNAMI_BASE_URL}/TEWS/doars.jsp`;
      const archiveResponse = await axios.get(archiveUrl, { timeout: 5000 });
      // Parse archive data if needed
    } catch (archiveError) {
      // Archive not critical, continue with warnings
    }

    return {
      activeWarnings: warnings,
      lastUpdate: lastUpdate,
      source: 'INCOIS_TEWS',
      dataUrl: warningsUrl
    };
  } catch (error) {
    console.error('Error fetching INCOIS tsunami warnings:', error.message);
    return {
      activeWarnings: [],
      lastUpdate: new Date().toISOString(),
      source: 'INCOIS_TEWS_ERROR',
      error: error.message
    };
  }
}

/**
 * Fetch cyclone tracking data from INCOIS
 * @returns {Promise<Object>} Cyclone data
 */
async function fetchCycloneData() {
  try {
    // Check storm surge bulletins (available during cyclone events)
    // Try ERDDAP for cyclone data
    try {
      const cycloneUrl = `${ERDDAP_BASE_URL}/tabledap/CycloneData.json`;
      const response = await axios.get(cycloneUrl, {
        params: {
          time: new Date().toISOString().split('T')[0],
          orderBy: 'time'
        },
        timeout: 10000
      });

      if (response.data && response.data.table && response.data.table.rows) {
        const cyclones = response.data.table.rows.map(row => {
          const cols = response.data.table.columnNames;
          const getValue = (name) => {
            const idx = cols.indexOf(name);
            return idx >= 0 ? row[idx] : null;
          };
          return {
            name: getValue('name') || getValue('cyclone_name'),
            latitude: getValue('latitude'),
            longitude: getValue('longitude'),
            windSpeed: getValue('windSpeed') || getValue('max_wind'),
            category: getValue('category') || getValue('intensity'),
            time: getValue('time')
          };
        });

        return {
          activeCyclones: cyclones.filter(c => c.time), // Filter active ones
          forecasts: [],
          lastUpdate: new Date().toISOString(),
          source: 'INCOIS_ERDDAP_CYCLONE',
          dataUrl: cycloneUrl
        };
      }
    } catch (erddapError) {
      console.warn('ERDDAP cyclone data failed:', erddapError.message);
    }

    // Fallback: Try cyclone portal or storm surge bulletin
    try {
      const stormSurgeUrl = `${TSUNAMI_BASE_URL}/TEWS/stormSurge.jsp`;
      const response = await axios.get(stormSurgeUrl, {
        timeout: 10000
      });

      // Parse cyclone/storm surge data
      let cyclones = [];
      if (typeof response.data === 'object' && response.data.cyclones) {
        cyclones = response.data.cyclones;
      }

      return {
        activeCyclones: cyclones,
        forecasts: response.data.forecasts || [],
        lastUpdate: response.data.lastUpdate || new Date().toISOString(),
        source: 'INCOIS_STORM_SURGE'
      };
    } catch (fallbackError) {
      console.warn('Storm surge bulletin failed:', fallbackError.message);
    }

    // If all sources fail, return empty
    return {
      activeCyclones: [],
      forecasts: [],
      lastUpdate: new Date().toISOString(),
      source: 'INCOIS_CYCLONE_NO_DATA'
    };
  } catch (error) {
    console.error('Error fetching INCOIS cyclone data:', error.message);
    return {
      activeCyclones: [],
      forecasts: [],
      lastUpdate: new Date().toISOString(),
      source: 'INCOIS_CYCLONE_ERROR',
      error: error.message
    };
  }
}

/**
 * Store INCOIS data in Firestore for historical analysis
 * @param {string} dataType - Type of data (oceanState, tsunami, cyclone)
 * @param {Object} data - Data to store
 */
async function storeINCOISData(dataType, data) {
  try {
    await db.collection('incoisData').add({
      type: dataType,
      data: data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error storing INCOIS ${dataType} data:`, error.message);
  }
}

/**
 * Get historical INCOIS data for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} days - Number of days of history
 * @returns {Promise<Array>} Historical data
 */
async function getHistoricalINCOISData(lat, lon, days = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const snapshot = await db.collection('incoisData')
      .where('type', '==', 'oceanState')
      .where('timestamp', '>=', cutoffDate)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching historical INCOIS data:', error.message);
    return [];
  }
}

/**
 * Monitor INCOIS data and create hazard alerts
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Hazard assessment
 */
async function assessHazardFromINCOISData(lat, lon) {
  try {
    const oceanState = await fetchOceanStateForecast(lat, lon);
    const tsunamiWarnings = await fetchTsunamiWarnings();
    const cycloneData = await fetchCycloneData();

    // Store data for historical analysis
    await storeINCOISData('oceanState', oceanState);
    if (tsunamiWarnings.activeWarnings.length > 0) {
      await storeINCOISData('tsunami', tsunamiWarnings);
    }
    if (cycloneData.activeCyclones.length > 0) {
      await storeINCOISData('cyclone', cycloneData);
    }

    // Assess hazard level based on data
    const hazards = [];
    let overallRisk = 'low';

    // Check wave height (high waves indicate potential hazard)
    if (oceanState.waveHeight > 3.0) {
      hazards.push({
        type: 'high_waves',
        severity: oceanState.waveHeight > 5.0 ? 'high' : 'medium',
        message: `High wave height detected: ${oceanState.waveHeight.toFixed(2)}m`,
        data: oceanState
      });
      overallRisk = oceanState.waveHeight > 5.0 ? 'high' : 'medium';
    }

    // Check tsunami warnings
    if (tsunamiWarnings.activeWarnings.length > 0) {
      hazards.push({
        type: 'tsunami',
        severity: 'critical',
        message: 'Active tsunami warning in the region',
        data: tsunamiWarnings
      });
      overallRisk = 'critical';
    }

    // Check cyclone activity
    if (cycloneData.activeCyclones.length > 0) {
      hazards.push({
        type: 'cyclone',
        severity: 'high',
        message: `${cycloneData.activeCyclones.length} active cyclone(s) detected`,
        data: cycloneData
      });
      if (overallRisk !== 'critical') {
        overallRisk = 'high';
      }
    }

    return {
      location: { lat, lon },
      hazards,
      overallRisk,
      timestamp: new Date().toISOString(),
      data: {
        oceanState,
        tsunamiWarnings,
        cycloneData
      }
    };
  } catch (error) {
    console.error('Error assessing hazard from INCOIS data:', error.message);
    throw error;
  }
}

/**
 * Fetch HF Radar data (real-time surface currents and waves)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} HF Radar data
 */
async function fetchHFRadarData(lat, lon) {
  try {
    const hfRadarUrl = `${HF_RADAR_URL}/api/data.json`; // Adjust endpoint as needed
    const response = await axios.get(hfRadarUrl, {
      params: {
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        time: new Date().toISOString()
      },
      timeout: 10000
    });

    return {
      currentSpeed: response.data.currentSpeed || null,
      currentDirection: response.data.currentDirection || null,
      waveHeight: response.data.waveHeight || null,
      timestamp: new Date().toISOString(),
      source: 'INCOIS_HF_RADAR',
      dataUrl: hfRadarUrl
    };
  } catch (error) {
    console.error('Error fetching HF Radar data:', error.message);
    return {
      currentSpeed: null,
      currentDirection: null,
      waveHeight: null,
      timestamp: new Date().toISOString(),
      source: 'INCOIS_HF_RADAR_ERROR',
      error: error.message
    };
  }
}

/**
 * Fetch Argo float data (temperature, salinity profiles)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusKm - Search radius in km (default: 50)
 * @returns {Promise<Object>} Argo data
 */
async function fetchArgoData(lat, lon, radiusKm = 50) {
  try {
    const argoUrl = `${ARGO_DATA_URL}/api/nearby.json`; // Adjust endpoint as needed
    const response = await axios.get(argoUrl, {
      params: {
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        radius: radiusKm,
        days: 7 // Last 7 days
      },
      timeout: 10000
    });

    return {
      floats: response.data.floats || [],
      nearestFloat: response.data.nearest || null,
      timestamp: new Date().toISOString(),
      source: 'INCOIS_ARGO',
      dataUrl: argoUrl
    };
  } catch (error) {
    console.error('Error fetching Argo data:', error.message);
    return {
      floats: [],
      nearestFloat: null,
      timestamp: new Date().toISOString(),
      source: 'INCOIS_ARGO_ERROR',
      error: error.message
    };
  }
}

/**
 * Get all available INCOIS datasets via ERDDAP
 * @returns {Promise<Array>} List of available datasets
 */
async function getAvailableDatasets() {
  try {
    const datasetsUrl = `${ERDDAP_BASE_URL}/tabledap/allDatasets.json`;
    const response = await axios.get(datasetsUrl, {
      params: {
        class: 'EDDTableFromMultidimNcFiles'
      },
      timeout: 10000
    });

    if (response.data && response.data.table && response.data.table.rows) {
      const datasets = response.data.table.rows.map(row => {
        const cols = response.data.table.columnNames;
        const getValue = (name) => {
          const idx = cols.indexOf(name);
          return idx >= 0 ? row[idx] : null;
        };
        return {
          datasetId: getValue('Dataset ID'),
          title: getValue('Title'),
          institution: getValue('Institution'),
          summary: getValue('Summary'),
          category: getValue('Category'),
          infoUrl: `${ERDDAP_BASE_URL}/info/${getValue('Dataset ID')}/index.html`
        };
      });

      return {
        datasets,
        total: datasets.length,
        source: 'INCOIS_ERDDAP',
        timestamp: new Date().toISOString()
      };
    }

    return { datasets: [], total: 0, source: 'INCOIS_ERDDAP' };
  } catch (error) {
    console.error('Error fetching available datasets:', error.message);
    return {
      datasets: [],
      total: 0,
      source: 'INCOIS_ERDDAP_ERROR',
      error: error.message
    };
  }
}

module.exports = {
  fetchOceanStateForecast,
  fetchTsunamiWarnings,
  fetchCycloneData,
  fetchHFRadarData,
  fetchArgoData,
  getAvailableDatasets,
  storeINCOISData,
  getHistoricalINCOISData,
  assessHazardFromINCOISData
};

