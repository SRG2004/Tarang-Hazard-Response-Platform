const admin = require('firebase-admin');
const db = admin.firestore();
const weatherService = require('./weatherService');
const incoisDataService = require('./incoisDataService');
const modelTrainingService = require('./modelTrainingService');
const notificationHandler = require('./notificationHandler');
const patternAnalysisService = require('./patternAnalysisService');

/**
 * Automatic Hazard Prediction Service
 * 
 * Analyzes weather and ocean conditions to predict hazards
 * and notify analysts when risks are detected
 */

// Thresholds for hazard detection
const HAZARD_THRESHOLDS = {
  waveHeight: {
    warning: 2.5, // meters
    critical: 4.0
  },
  windSpeed: {
    warning: 15, // m/s
    critical: 25
  },
  seaSurfaceTemp: {
    warning: { min: 28, max: 32 }, // Celsius
    critical: { min: 30, max: 35 }
  },
  swellHeight: {
    warning: 2.0,
    critical: 3.5
  }
};

/**
 * Predict hazards based on current weather and ocean conditions
 */
async function predictHazardsFromConditions() {
  try {
    console.log('========================================');
    console.log('Starting automatic hazard prediction...');
    console.log('========================================');

    const predictions = [];

    // Get weather data for coastal areas
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

    // Get latest model for prediction
    let model = null;
    try {
      const modelDoc = await db.collection('customModels')
        .doc('hazard-predictor-v1')
        .get();

      if (modelDoc.exists) {
        model = modelDoc.data();
      }
    } catch (error) {
      console.warn('Could not load model, using rule-based prediction:', error.message);
    }

    // Check each coastal city
    for (const city of coastalCities) {
      try {
        console.log(`Analyzing conditions for ${city.name}...`);

        // Get weather data
        const weather = await weatherService.getCurrentWeather(city.lat, city.lon);
        if (!weather) {
          console.warn(`Could not fetch weather for ${city.name}`);
          continue;
        }

        // Get INCOIS ocean data
        const oceanData = await incoisDataService.getOceanStateForecast(city.lat, city.lon);

        // Store INCOIS data for training/testing
        if (oceanData) {
          try {
            await incoisDataService.storeINCOISData('oceanState', {
              ...oceanData,
              latitude: city.lat,
              longitude: city.lon,
              location: city.name
            });
          } catch (error) {
            console.warn(`Could not store INCOIS data for ${city.name}:`, error.message);
          }
        }

        // Analyze patterns for early warning predictions
        const patternAnalysis = await patternAnalysisService.analyzePatternsForEarlyWarning(
          city.lat,
          city.lon,
          24 // Look back 24 hours
        );

        // Analyze current conditions and predict hazards
        const prediction = analyzeConditionsAndPredict(
          city,
          weather,
          oceanData,
          model
        );

        // Enhance prediction with pattern analysis if available
        if (patternAnalysis.hasPattern && patternAnalysis.earlyWarning) {
          const earlyWarningPrediction = {
            ...prediction,
            hasHazard: true,
            predictionType: 'early_warning', // Mark as early warning
            hazardType: patternAnalysis.predictedHazard,
            severity: patternAnalysis.severity,
            confidence: patternAnalysis.confidence,
            estimatedTimeToHazard: patternAnalysis.estimatedTimeToHazard, // hours
            earlyWarning: true,
            patternDetails: patternAnalysis.patternDetails,
            location: city.name,
            latitude: city.lat,
            longitude: city.lon,
            predictedAt: new Date().toISOString()
          };

          predictions.push(earlyWarningPrediction);
          console.log(`🚨 EARLY WARNING for ${city.name}: ${patternAnalysis.predictedHazard} predicted in ~${patternAnalysis.estimatedTimeToHazard}h (confidence: ${(patternAnalysis.confidence * 100).toFixed(0)}%)`);
        } else if (prediction && prediction.hasHazard) {
          predictions.push({
            ...prediction,
            predictionType: 'current_conditions'
          });
          console.log(`⚠️  Hazard predicted for ${city.name}: ${prediction.hazardType} (severity: ${prediction.severity})`);
        } else {
          console.log(`✓ Safe conditions for ${city.name}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing ${city.name}:`, error.message);
      }
    }

    console.log(`Found ${predictions.length} predicted hazards`);

    // Save predictions to database
    if (predictions.length > 0) {
      await savePredictions(predictions);

      // Notify analysts about predicted hazards
      await notifyAnalystsOfPredictions(predictions);

      // Notify authorities about early warnings (critical priority)
      const earlyWarnings = predictions.filter(p => p.earlyWarning === true);
      if (earlyWarnings.length > 0) {
        await notifyAuthoritiesOfEarlyWarnings(earlyWarnings);
      }
    }

    return {
      success: true,
      predictionsCount: predictions.length,
      predictions
    };
  } catch (error) {
    console.error('Error in automatic hazard prediction:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analyze weather and ocean conditions to predict hazards
 */
function analyzeConditionsAndPredict(city, weather, oceanData, model) {
  const hazards = [];
  let maxSeverity = 'low';

  // Analyze wave height
  const waveHeight = oceanData?.waveHeight || oceanData?.swellHeight || 0;
  if (waveHeight >= HAZARD_THRESHOLDS.waveHeight.critical) {
    hazards.push({
      type: 'High Waves',
      severity: 'critical',
      message: `Extremely high waves (${waveHeight.toFixed(2)}m) detected. Avoid coastal activities.`
    });
    maxSeverity = 'critical';
  } else if (waveHeight >= HAZARD_THRESHOLDS.waveHeight.warning) {
    hazards.push({
      type: 'High Waves',
      severity: 'warning',
      message: `High waves (${waveHeight.toFixed(2)}m) detected. Exercise caution.`
    });
    if (maxSeverity === 'low') maxSeverity = 'warning';
  }

  // Analyze wind speed
  const windSpeed = weather.windSpeed || 0;
  if (windSpeed >= HAZARD_THRESHOLDS.windSpeed.critical) {
    hazards.push({
      type: 'Strong Winds',
      severity: 'critical',
      message: `Extremely strong winds (${windSpeed.toFixed(1)} m/s) detected. Storm conditions likely.`
    });
    maxSeverity = 'critical';
  } else if (windSpeed >= HAZARD_THRESHOLDS.windSpeed.warning) {
    hazards.push({
      type: 'Strong Winds',
      severity: 'warning',
      message: `Strong winds (${windSpeed.toFixed(1)} m/s) detected. Be cautious.`
    });
    if (maxSeverity === 'low') maxSeverity = 'warning';
  }

  // Analyze weather conditions
  const weatherMain = (weather.weather?.[0]?.main?.toLowerCase() || weather.description?.toLowerCase() || '');
  const weatherDesc = weather.weather?.[0]?.description || weather.description || 'Unknown';
  if (weatherMain.includes('storm') || weatherMain.includes('hurricane') || weatherMain.includes('cyclone')) {
    hazards.push({
      type: 'Storm Conditions',
      severity: 'critical',
      message: `Storm conditions detected: ${weatherDesc}`
    });
    maxSeverity = 'critical';
  } else if (weatherMain.includes('rain') && windSpeed > 10) {
    hazards.push({
      type: 'Heavy Rain with Winds',
      severity: 'warning',
      message: `Heavy rain with strong winds. Coastal flooding possible.`
    });
    if (maxSeverity === 'low') maxSeverity = 'warning';
  }

  // Use ML model if available for additional prediction
  if (model && weather.description) {
    try {
      // In a real implementation, you would call the model prediction here
      // For now, we use rule-based predictions above
    } catch (error) {
      console.warn('Model prediction failed, using rule-based only:', error.message);
    }
  }

  if (hazards.length === 0) {
    return null;
  }

  return {
    location: city.name,
    latitude: city.lat,
    longitude: city.lon,
    hasHazard: true,
    hazardType: hazards.map(h => h.type).join(', '),
    severity: maxSeverity,
    hazards: hazards,
    conditions: {
      waveHeight: waveHeight,
      windSpeed: windSpeed,
      temperature: weather.temperature || 0,
      humidity: weather.humidity || 0,
      pressure: weather.pressure || 0,
      weather: weather.weather?.[0]?.description || weather.description || 'N/A'
    },
    predictedAt: new Date().toISOString(),
    confidence: maxSeverity === 'critical' ? 0.9 : 0.7
  };
}

/**
 * Save predictions to Firestore
 */
async function savePredictions(predictions) {
  try {
    const batch = db.batch();

    for (const prediction of predictions) {
      const docRef = db.collection('hazardPredictions').doc();
      batch.set(docRef, {
        ...prediction,
        type: 'automatic_prediction',
        status: 'pending_review',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    console.log(`Saved ${predictions.length} predictions to database`);
  } catch (error) {
    console.error('Error saving predictions:', error);
    throw error;
  }
}

/**
 * Notify authorities (officials and admins) about early warning predictions
 */
async function notifyAuthoritiesOfEarlyWarnings(earlyWarnings) {
  try {
    // Get all authorities
    const authoritiesSnapshot = await db.collection('users')
      .where('role', '==', 'authority')
      .get();

    const authorities = [];
    authoritiesSnapshot.forEach(doc => {
      authorities.push({ id: doc.id, ...doc.data() });
    });

    if (authorities.length === 0) {
      console.log('No authorities found to notify');
      return;
    }

    const pushTokens = [];
    const emailRecipients = [];

    // Get notification settings for each authority
    for (const authority of authorities) {
      const settings = await notificationHandler.getUserSettings(authority.id);

      // Early warnings always sent regardless of settings (critical priority)
      if (authority.notificationToken) {
        pushTokens.push(authority.notificationToken);
      }
      if (authority.email) {
        emailRecipients.push(authority.email);
      }
    }

    // Group early warnings by hazard type
    const warningsByType = {};
    earlyWarnings.forEach(warning => {
      const hazardType = warning.hazardType || 'unknown';
      if (!warningsByType[hazardType]) {
        warningsByType[hazardType] = [];
      }
      warningsByType[hazardType].push(warning);
    });

    // Send push notifications
    if (pushTokens.length > 0) {
      const hazardTypesList = Object.keys(warningsByType).join(', ');
      await notificationHandler.sendPushNotification(
        pushTokens,
        {
          title: '🚨 EARLY WARNING: Ocean Hazard Patterns Detected',
          body: `${earlyWarnings.length} early warning${earlyWarnings.length > 1 ? 's' : ''} predicted: ${hazardTypesList}`,
          icon: '/logo192.png'
        },
        {
          type: 'early_warning_prediction',
          severity: 'critical',
          count: earlyWarnings.length,
          url: '/ml-models'
        }
      );
    }

    // Send email notifications
    if (emailRecipients.length > 0) {
      const emailService = require('./emailService');

      // Prepare email content
      const emailContent = {
        type: 'early_warning',
        warnings: earlyWarnings,
        summary: `${earlyWarnings.length} early warning prediction${earlyWarnings.length > 1 ? 's' : ''} based on pattern analysis`,
        message: 'Pattern analysis has identified conditions that typically precede ocean hazards. Immediate attention recommended.'
      };

      // Send detailed email with all warnings
      await emailService.sendEarlyWarningAlert(emailContent, emailRecipients);
    }

    console.log(`Early warning notifications sent: ${pushTokens.length} push, ${emailRecipients.length} email`);

    return {
      success: true,
      push: pushTokens.length,
      email: emailRecipients.length,
      warningsCount: earlyWarnings.length
    };
  } catch (error) {
    console.error('Error notifying authorities of early warnings:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Notify analysts about predicted hazards
 */
async function notifyAnalystsOfPredictions(predictions) {
  try {
    // Get all authorities
    const analystsSnapshot = await db.collection('users')
      .where('role', '==', 'authority')
      .get();

    const analysts = [];
    analystsSnapshot.forEach(doc => {
      analysts.push({ id: doc.id, ...doc.data() });
    });

    if (analysts.length === 0) {
      console.log('No analysts found to notify');
      return;
    }

    const pushTokens = [];
    const emailRecipients = [];

    // Get notification settings for each analyst
    for (const analyst of analysts) {
      const settings = await notificationHandler.getUserSettings(analyst.id);

      if (settings && settings.criticalAlerts) {
        if (settings.pushEnabled && analyst.notificationToken) {
          pushTokens.push(analyst.notificationToken);
        }
        if (settings.emailEnabled && analyst.email) {
          emailRecipients.push(analyst.email);
        }
      }
    }

    // Group predictions by severity
    const criticalPredictions = predictions.filter(p => p.severity === 'critical');
    const warningPredictions = predictions.filter(p => p.severity === 'warning');

    if (criticalPredictions.length > 0) {
      const message = `${criticalPredictions.length} critical hazard${criticalPredictions.length > 1 ? 's' : ''} predicted`;

      // Send push notifications
      if (pushTokens.length > 0) {
        await notificationHandler.sendPushNotification(
          pushTokens,
          {
            title: '🚨 Critical Hazard Predictions',
            body: message,
            icon: '/logo192.png'
          },
          {
            type: 'hazard_prediction',
            severity: 'critical',
            count: criticalPredictions.length,
            url: '/ml-models'
          }
        );
      }

      // Send email notifications
      if (emailRecipients.length > 0) {
        const emailService = require('./emailService');
        await emailService.sendHazardPredictionAlert(
          {
            predictions: criticalPredictions,
            type: 'critical',
            message
          },
          emailRecipients
        );
      }
    }

    console.log(`Notified ${pushTokens.length} analysts via push, ${emailRecipients.length} via email`);

    return {
      success: true,
      push: pushTokens.length,
      email: emailRecipients.length,
      criticalCount: criticalPredictions.length,
      warningCount: warningPredictions.length
    };
  } catch (error) {
    console.error('Error notifying analysts:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  predictHazardsFromConditions,
  analyzeConditionsAndPredict
};

