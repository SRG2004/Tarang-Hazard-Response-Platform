const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Pattern Analysis Service for Early Warning Predictions
 * 
 * Analyzes time-series patterns from INCOIS data to identify
 * conditions that precede ocean hazards, enabling early warning
 * before hazards fully develop.
 */

/**
 * Analyze time-series patterns to predict hazards before they occur
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} lookbackHours - Hours to look back for pattern analysis
 * @returns {Promise<Object>} Pattern analysis result with early warning predictions
 */
async function analyzePatternsForEarlyWarning(lat, lon, lookbackHours = 24) {
  try {
    console.log(`[Pattern Analysis] Analyzing patterns for ${lat},${lon} (${lookbackHours}h lookback)`);
    
    // Get historical data for this location
    const historicalData = await getHistoricalSequence(lat, lon, lookbackHours);
    
    if (historicalData.length < 3) {
      return {
        hasPattern: false,
        reason: 'Insufficient historical data for pattern analysis',
        dataPoints: historicalData.length
      };
    }
    
    // Analyze patterns for different hazard types
    const patternResults = {
      tsunami: analyzeTsunamiPatterns(historicalData),
      cyclone: analyzeCyclonePatterns(historicalData),
      highWaves: analyzeHighWavePatterns(historicalData),
      stormSurge: analyzeStormSurgePatterns(historicalData),
      coastalFlooding: analyzeFloodingPatterns(historicalData)
    };
    
    // Find the most significant pattern
    const significantPatterns = Object.entries(patternResults)
      .filter(([_, result]) => result.confidence > 0.6)
      .sort((a, b) => b[1].confidence - a[1].confidence);
    
    if (significantPatterns.length === 0) {
      return {
        hasPattern: false,
        reason: 'No significant hazard patterns detected',
        dataPoints: historicalData.length,
        allPatterns: patternResults
      };
    }
    
    const [primaryHazard, primaryResult] = significantPatterns[0];
    
    // Calculate time until predicted hazard (based on pattern progression)
    const estimatedTimeToHazard = estimateTimeToHazard(historicalData, primaryResult);
    
    return {
      hasPattern: true,
      predictedHazard: primaryHazard,
      confidence: primaryResult.confidence,
      severity: primaryResult.severity,
      estimatedTimeToHazard: estimatedTimeToHazard, // hours
      earlyWarning: estimatedTimeToHazard > 2, // Early warning if > 2 hours ahead
      patternDetails: primaryResult,
      allPatterns: patternResults,
      location: { lat, lon },
      analyzedAt: new Date().toISOString(),
      dataPoints: historicalData.length
    };
  } catch (error) {
    console.error('[Pattern Analysis] Error analyzing patterns:', error);
    return {
      hasPattern: false,
      error: error.message
    };
  }
}

/**
 * Get historical sequence of ocean conditions for pattern analysis
 */
async function getHistoricalSequence(lat, lon, hours = 24) {
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    // Query INCOIS data for this location within time window
    // Use approximate location matching (within 0.5 degrees)
    const latMin = lat - 0.5;
    const latMax = lat + 0.5;
    const lonMin = lon - 0.5;
    const lonMax = lon + 0.5;
    
    let snapshot = await db.collection('incoisData')
      .where('latitude', '>=', latMin)
      .where('latitude', '<=', latMax)
      .where('longitude', '>=', lonMin)
      .where('longitude', '<=', lonMax)
      .orderBy('latitude')
      .orderBy('longitude')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();
    
    // If no exact match, try broader search
    if (snapshot.empty) {
      snapshot = await db.collection('incoisData')
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();
    }
    
    const sequence = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const recordData = data.data || data;
      const timestamp = recordData.timestamp || data.timestamp || data.createdAt?.toDate?.() || new Date();
      
      // Filter by time window
      if (timestamp instanceof Date && timestamp >= startTime) {
        sequence.push({
          id: doc.id,
          timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
          waveHeight: recordData.waveHeight || recordData.hs || null,
          windSpeed: recordData.windSpeed || recordData.ws || null,
          windDirection: recordData.windDirection || null,
          currentSpeed: recordData.currentSpeed || (recordData.u ? Math.abs(recordData.u) : null),
          currentDirection: recordData.currentDirection || null,
          seaSurfaceTemp: recordData.seaSurfaceTemp || recordData.sst || null,
          pressure: recordData.pressure || recordData.pres || null,
          latitude: recordData.latitude || data.latitude || null,
          longitude: recordData.longitude || data.longitude || null,
          tsunamiWarnings: recordData.tsunamiWarnings || null,
          cycloneData: recordData.cycloneData || null
        });
      }
    });
    
    // Sort by timestamp (oldest first)
    sequence.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return sequence;
  } catch (error) {
    console.error('[Pattern Analysis] Error getting historical sequence:', error);
    return [];
  }
}

/**
 * Analyze patterns that precede tsunamis
 * Patterns: Rapid ocean depth change, unusual current patterns, seismic activity indicators
 */
function analyzeTsunamiPatterns(sequence) {
  if (sequence.length < 2) {
    return { confidence: 0, reason: 'Insufficient data' };
  }
  
  const current = sequence[sequence.length - 1];
  const previous = sequence[sequence.length - 2];
  
  // Check for rapid water level changes (proxy via wave patterns)
  const waveHeightChange = current.waveHeight && previous.waveHeight 
    ? Math.abs(current.waveHeight - previous.waveHeight)
    : 0;
  
  // Check for unusual current patterns
  const currentSpeedChange = current.currentSpeed && previous.currentSpeed
    ? Math.abs(current.currentSpeed - previous.currentSpeed)
    : 0;
  
  // Check for existing tsunami warnings
  if (current.tsunamiWarnings?.activeWarnings?.length > 0) {
    return {
      confidence: 0.95,
      severity: 'critical',
      reason: 'Active tsunami warning detected',
      indicators: ['tsunami_warning_active']
    };
  }
  
  // Pattern: Rapid wave height increase + unusual currents
  if (waveHeightChange > 1.5 && currentSpeedChange > 0.8) {
    return {
      confidence: 0.75,
      severity: 'critical',
      reason: 'Rapid ocean condition changes detected (tsunami precursor pattern)',
      indicators: ['rapid_wave_change', 'unusual_currents'],
      waveChange: waveHeightChange,
      currentChange: currentSpeedChange
    };
  }
  
  // Pattern: Gradual but consistent wave height increase
  const recentTrend = calculateTrend(sequence.slice(-6), 'waveHeight');
  if (recentTrend > 0.3 && current.waveHeight > 2.0) {
    return {
      confidence: 0.65,
      severity: 'high',
      reason: 'Consistent wave height increase detected',
      indicators: ['increasing_wave_trend'],
      trend: recentTrend
    };
  }
  
  return { confidence: 0, reason: 'No tsunami patterns detected' };
}

/**
 * Analyze patterns that precede cyclones
 * Patterns: Decreasing pressure, increasing wind speed, temperature changes
 */
function analyzeCyclonePatterns(sequence) {
  if (sequence.length < 3) {
    return { confidence: 0, reason: 'Insufficient data' };
  }
  
  const recent = sequence.slice(-6);
  const current = sequence[sequence.length - 1];
  
  // Check for existing cyclone warnings
  if (current.cycloneData?.activeCyclones?.length > 0) {
    return {
      confidence: 0.95,
      severity: 'critical',
      reason: 'Active cyclone detected',
      indicators: ['cyclone_active']
    };
  }
  
  // Pattern: Decreasing pressure + increasing wind
  const pressureTrend = calculateTrend(recent, 'pressure');
  const windTrend = calculateTrend(recent, 'windSpeed');
  
  if (pressureTrend < -0.5 && windTrend > 1.0 && current.pressure < 1005) {
    return {
      confidence: 0.85,
      severity: 'critical',
      reason: 'Cyclone precursor pattern: Decreasing pressure with increasing winds',
      indicators: ['decreasing_pressure', 'increasing_winds'],
      pressureTrend: pressureTrend,
      windTrend: windTrend
    };
  }
  
  // Pattern: Rapid wind speed increase
  if (windTrend > 2.0 && current.windSpeed > 15) {
    return {
      confidence: 0.70,
      severity: 'high',
      reason: 'Rapid wind speed increase (possible cyclone approach)',
      indicators: ['rapid_wind_increase'],
      windSpeed: current.windSpeed,
      windTrend: windTrend
    };
  }
  
  // Pattern: Low pressure system
  if (current.pressure < 1000 && windTrend > 0.5) {
    return {
      confidence: 0.65,
      severity: 'high',
      reason: 'Low pressure system with increasing winds',
      indicators: ['low_pressure', 'increasing_winds'],
      pressure: current.pressure
    };
  }
  
  return { confidence: 0, reason: 'No cyclone patterns detected' };
}

/**
 * Analyze patterns that precede high wave events
 * Patterns: Gradual wave height increase, consistent wind patterns
 */
function analyzeHighWavePatterns(sequence) {
  if (sequence.length < 3) {
    return { confidence: 0, reason: 'Insufficient data' };
  }
  
  const recent = sequence.slice(-6);
  const current = sequence[sequence.length - 1];
  
  // Pattern: Gradual wave height increase over time
  const waveTrend = calculateTrend(recent, 'waveHeight');
  const windTrend = calculateTrend(recent, 'windSpeed');
  
  if (waveTrend > 0.2 && current.waveHeight > 2.5) {
    const predictedWaveHeight = current.waveHeight + (waveTrend * 6); // Project 6 hours ahead
    
    if (predictedWaveHeight > 4.0) {
      return {
        confidence: 0.80,
        severity: 'critical',
        reason: 'High waves predicted: Gradual increase pattern detected',
        indicators: ['increasing_wave_trend'],
        currentWaveHeight: current.waveHeight,
        predictedWaveHeight: predictedWaveHeight,
        timeToPeak: estimateTimeToPeak(sequence, 'waveHeight')
      };
    } else if (predictedWaveHeight > 3.0) {
      return {
        confidence: 0.70,
        severity: 'high',
        reason: 'Moderate-high waves predicted based on trend',
        indicators: ['increasing_wave_trend'],
        currentWaveHeight: current.waveHeight,
        predictedWaveHeight: predictedWaveHeight
      };
    }
  }
  
  // Pattern: High wind + moderate waves = high waves coming
  if (current.windSpeed > 18 && current.waveHeight > 2.0 && windTrend > 0.5) {
    return {
      confidence: 0.75,
      severity: 'high',
      reason: 'High wind conditions likely to generate high waves',
      indicators: ['high_winds', 'moderate_waves'],
      windSpeed: current.windSpeed,
      waveHeight: current.waveHeight
    };
  }
  
  return { confidence: 0, reason: 'No high wave patterns detected' };
}

/**
 * Analyze patterns that precede storm surge
 * Patterns: Wind direction change + increasing wind speed + low pressure
 */
function analyzeStormSurgePatterns(sequence) {
  if (sequence.length < 4) {
    return { confidence: 0, reason: 'Insufficient data' };
  }
  
  const recent = sequence.slice(-6);
  const current = sequence[sequence.length - 1];
  
  // Pattern: Onshore wind direction + high wind speed + low pressure
  const windTrend = calculateTrend(recent, 'windSpeed');
  const pressureTrend = calculateTrend(recent, 'pressure');
  
  // Check if wind is blowing onshore (simplified: check if wind direction is consistent)
  if (current.windSpeed > 20 && pressureTrend < -0.3 && current.pressure < 1005) {
    return {
      confidence: 0.80,
      severity: 'critical',
      reason: 'Storm surge precursor pattern: High onshore winds with low pressure',
      indicators: ['high_onshore_winds', 'decreasing_pressure'],
      windSpeed: current.windSpeed,
      pressure: current.pressure
    };
  }
  
  return { confidence: 0, reason: 'No storm surge patterns detected' };
}

/**
 * Analyze patterns that precede coastal flooding
 * Patterns: High rainfall + high waves + high tide timing
 */
function analyzeFloodingPatterns(sequence) {
  if (sequence.length < 3) {
    return { confidence: 0, reason: 'Insufficient data' };
  }
  
  const current = sequence[sequence.length - 1];
  const recent = sequence.slice(-6);
  
  // Pattern: High waves + consistent conditions
  const waveTrend = calculateTrend(recent, 'waveHeight');
  
  if (current.waveHeight > 3.0 && waveTrend > 0) {
    return {
      confidence: 0.70,
      severity: 'high',
      reason: 'Coastal flooding risk: High waves with increasing trend',
      indicators: ['high_waves', 'increasing_trend'],
      waveHeight: current.waveHeight
    };
  }
  
  return { confidence: 0, reason: 'No flooding patterns detected' };
}

/**
 * Calculate trend (rate of change) for a sequence
 */
function calculateTrend(sequence, field) {
  if (sequence.length < 2) return 0;
  
  const values = sequence
    .filter(item => item[field] !== null && item[field] !== undefined)
    .map(item => item[field]);
  
  if (values.length < 2) return 0;
  
  // Simple linear regression slope
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  return slope;
}

/**
 * Estimate time until hazard occurs based on pattern progression
 */
function estimateTimeToHazard(sequence, patternResult) {
  if (!patternResult.indicators || patternResult.indicators.length === 0) {
    return null;
  }
  
  // Estimate based on trend rate
  if (patternResult.predictedWaveHeight) {
    const current = sequence[sequence.length - 1];
    const waveTrend = calculateTrend(sequence.slice(-6), 'waveHeight');
    if (waveTrend > 0) {
      const timeToPeak = (patternResult.predictedWaveHeight - current.waveHeight) / waveTrend;
      return Math.max(1, Math.min(48, timeToPeak)); // Clamp between 1-48 hours
    }
  }
  
  // Default estimates based on hazard type and confidence
  if (patternResult.confidence > 0.8) {
    return 6; // High confidence: 6 hours
  } else if (patternResult.confidence > 0.7) {
    return 12; // Medium-high: 12 hours
  } else {
    return 24; // Medium: 24 hours
  }
}

/**
 * Estimate time to peak value for a given field
 */
function estimateTimeToPeak(sequence, field) {
  const trend = calculateTrend(sequence.slice(-6), field);
  if (trend <= 0) return null;
  
  const current = sequence[sequence.length - 1][field];
  if (!current) return null;
  
  // Estimate when trend might peak (assuming it continues)
  // This is a simplified estimation
  return Math.max(2, Math.min(24, 24 / trend)); // Hours
}

/**
 * Analyze patterns for multiple locations
 */
async function analyzePatternsForCoastalCities() {
  const coastalCities = [
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
    { name: 'Kochi', lat: 9.9312, lon: 76.2673 },
    { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185 },
    { name: 'Goa', lat: 15.2993, lon: 74.1240 },
    { name: 'Mangalore', lat: 12.9141, lon: 74.8560 },
    { name: 'Puri', lat: 19.8135, lon: 85.8315 }
  ];
  
  const results = [];
  
  for (const city of coastalCities) {
    try {
      const analysis = await analyzePatternsForEarlyWarning(city.lat, city.lon, 24);
      if (analysis.hasPattern) {
        results.push({
          location: city.name,
          ...analysis
        });
      }
    } catch (error) {
      console.error(`Error analyzing patterns for ${city.name}:`, error.message);
    }
  }
  
  return results;
}

module.exports = {
  analyzePatternsForEarlyWarning,
  analyzePatternsForCoastalCities,
  getHistoricalSequence,
  analyzeTsunamiPatterns,
  analyzeCyclonePatterns,
  analyzeHighWavePatterns,
  analyzeStormSurgePatterns,
  analyzeFloodingPatterns
};

