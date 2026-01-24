const { HfInference } = require('@huggingface/inference');
const admin = require('firebase-admin');
const db = admin.firestore();
const { loadCustomModel, EnsembleHazardPredictor } = require('./modelTrainingService');
const patternAnalysisService = require('./patternAnalysisService');

/**
 * Hazard Prediction Service using Custom Fine-tuned Models
 * 
 * Uses custom ensemble model built on top of Hugging Face base models
 * Trained on historical verified reports and INCOIS data
 */

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const hf = new HfInference(HF_API_KEY);

// Use custom model by default
let customModel = null;

// Model configurations
const MODELS = {
  // Text classification for hazard detection
  hazardClassifier: 'distilbert-base-uncased', // Base model - can be fine-tuned
  // Sentiment analysis for social media
  sentimentAnalyzer: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
  // Named Entity Recognition for location extraction
  nerModel: 'dslim/bert-base-NER',
  // Text generation for report summarization
  summarizer: 'facebook/bart-large-cnn'
};

/**
 * Initialize custom model (lazy loading)
 */
async function initializeCustomModel() {
  if (!customModel) {
    try {
      const loaded = await loadCustomModel('latest');
      customModel = loaded.model;
      console.log('Custom model loaded successfully');
    } catch (error) {
      console.warn('Could not load custom model, using default ensemble:', error.message);
      // Fallback to default ensemble if no trained model exists
      customModel = new EnsembleHazardPredictor();
    }
  }
  return customModel;
}

/**
 * Predict hazard using custom fine-tuned model with pattern analysis for early warnings
 */
async function predictHazardFromText(text, context = {}) {
  try {
    // Initialize custom model if not already loaded
    const model = await initializeCustomModel();
    
    // Combine text with context information for better prediction
    const enrichedText = context.location || context.waveHeight || context.windSpeed
      ? `${text}. Location: ${context.location || ''}. Wave Height: ${context.waveHeight || ''}m. Wind Speed: ${context.windSpeed || ''}m/s.`
      : text;

    // Use custom ensemble model with full context
    const prediction = await model.predict(enrichedText, context);
    
    // Enhance with pattern analysis if location data available
    let patternAnalysis = null;
    let earlyWarning = false;
    
    if (context.latitude !== undefined && context.longitude !== undefined) {
      try {
        patternAnalysis = await patternAnalysisService.analyzePatternsForEarlyWarning(
          context.latitude,
          context.longitude,
          24 // Look back 24 hours for patterns
        );
        
        // If pattern analysis shows early warning, enhance prediction
        if (patternAnalysis.hasPattern && patternAnalysis.earlyWarning) {
          earlyWarning = true;
          // Use pattern-based prediction for early warnings
          return {
            text,
            hazards: prediction.hazards || [],
            overallRisk: patternAnalysis.severity,
            severity: patternAnalysis.severity,
            confidence: patternAnalysis.confidence,
            method: 'pattern_analysis_early_warning',
            earlyWarning: true,
            estimatedTimeToHazard: patternAnalysis.estimatedTimeToHazard,
            predictedHazard: patternAnalysis.predictedHazard,
            patternDetails: patternAnalysis.patternDetails,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        console.warn('Pattern analysis failed, using standard prediction:', error.message);
      }
    }
    
    // Ensure overallRisk uses context if available (wave height, wind speed determine severity)
    let overallRisk = prediction.overallRisk || 'low';
    
    // Override with context-based severity if context data is available
    if (context.waveHeight !== undefined || context.windSpeed !== undefined) {
      const waveHeight = context.waveHeight || 0;
      const windSpeed = context.windSpeed || 0;
      const currentSpeed = context.currentSpeed || 0;
      
      // Rule-based severity matching training data logic
      if (waveHeight > 4.0 || windSpeed > 25) {
        overallRisk = 'critical';
      } else if (waveHeight > 3.0 || windSpeed > 18 || currentSpeed > 1.5) {
        overallRisk = 'high';
      } else if (waveHeight > 2.0 || windSpeed > 12 || currentSpeed > 1.0) {
        overallRisk = 'medium';
      } else if (waveHeight > 1.0 || windSpeed > 7 || currentSpeed > 0.5) {
        overallRisk = 'low';
      } else {
        overallRisk = 'low'; // Default
      }
    }
    
    // Incorporate pattern trends if available in context
    if (context.waveHeightTrend > 0.3 || context.windSpeedTrend > 2.0) {
      // Pattern suggests increasing severity
      if (overallRisk === 'low' && (context.waveHeightTrend > 0.5 || context.windSpeedTrend > 3.0)) {
        overallRisk = 'medium';
      } else if (overallRisk === 'medium' && (context.waveHeightTrend > 0.7 || context.windSpeedTrend > 4.0)) {
        overallRisk = 'high';
      }
      // Increase confidence if pattern is consistent
      if (prediction.confidence) {
        prediction.confidence = Math.min(0.95, prediction.confidence + 0.1);
      }
    }
    
    return {
      text,
      hazards: prediction.hazards,
      overallRisk: overallRisk,
      severity: overallRisk, // Also include as severity for consistency
      confidence: prediction.confidence,
      method: patternAnalysis ? 'custom_ensemble_with_patterns' : (prediction.method || 'custom_ensemble'),
      patternAnalysis: patternAnalysis,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error predicting hazard from text:', error.message);
    // Fallback to simple prediction if custom model fails
    return {
      text,
      hazards: [],
      overallRisk: 'low',
      confidence: 0,
      method: 'fallback',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Calculate severity based on prediction and context
 */
function calculateSeverity(hazardType, confidence, context) {
  // Base severity on confidence score
  if (confidence > 0.8) return 'high';
  if (confidence > 0.6) return 'medium';
  if (confidence > 0.4) return 'low';

  // Adjust based on context (wave height, weather, etc.)
  if (context.waveHeight > 4.0) return 'high';
  if (context.waveHeight > 2.5) return 'medium';

  // Critical hazards are always high severity
  if (hazardType.includes('tsunami') || hazardType.includes('cyclone')) {
    return 'critical';
  }

  return 'low';
}

/**
 * Analyze sentiment of social media posts related to hazards
 */
async function analyzeHazardSentiment(text) {
  try {
    const result = await hf.sentimentAnalysis({
      model: MODELS.sentimentAnalyzer,
      inputs: text
    });

    return {
      sentiment: result[0]?.label || 'neutral',
      score: result[0]?.score || 0,
      text
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error.message);
    return {
      sentiment: 'neutral',
      score: 0,
      text
    };
  }
}

/**
 * Extract locations and entities from text
 */
async function extractEntities(text) {
  try {
    const result = await hf.tokenClassification({
      model: MODELS.nerModel,
      inputs: text
    });

    const locations = result
      .filter(entity => entity.entity_group === 'LOC')
      .map(entity => entity.word);

    const organizations = result
      .filter(entity => entity.entity_group === 'ORG')
      .map(entity => entity.word);

    return {
      locations,
      organizations,
      entities: result
    };
  } catch (error) {
    console.error('Error extracting entities:', error.message);
    return {
      locations: [],
      organizations: [],
      entities: []
    };
  }
}

/**
 * Predict hazard from multiple data sources (ensemble prediction)
 */
async function predictHazardFromMultipleSources(sources) {
  try {
    const predictions = await Promise.all(
      sources.map(async (source) => {
        if (source.type === 'text') {
          return await predictHazardFromText(source.content, source.context);
        } else if (source.type === 'incois_data') {
          return await predictHazardFromINCOISData(source.data);
        } else if (source.type === 'social_media') {
          const prediction = await predictHazardFromText(source.content, source.context);
          const sentiment = await analyzeHazardSentiment(source.content);
          return {
            ...prediction,
            sentiment
          };
        }
        return null;
      })
    );

    // Combine predictions (ensemble method)
    const combinedHazards = {};
    let maxSeverity = 'low';
    let maxConfidence = 0;

    predictions.forEach(pred => {
      if (!pred || !pred.hazards) return;

      pred.hazards.forEach(hazard => {
        if (!combinedHazards[hazard.type]) {
          combinedHazards[hazard.type] = {
            type: hazard.type,
            confidences: [],
            severities: []
          };
        }
        combinedHazards[hazard.type].confidences.push(hazard.confidence);
        combinedHazards[hazard.type].severities.push(hazard.severity);
      });

      if (pred.overallRisk === 'critical' || pred.overallRisk === 'high') {
        maxSeverity = pred.overallRisk;
      }
      if (pred.confidence > maxConfidence) {
        maxConfidence = pred.confidence;
      }
    });

    // Calculate average confidence and determine final severity
    const finalHazards = Object.values(combinedHazards).map(hazard => ({
      type: hazard.type,
      confidence: hazard.confidences.reduce((a, b) => a + b, 0) / hazard.confidences.length,
      severity: getMostCommon(hazard.severities)
    }));

    return {
      hazards: finalHazards.sort((a, b) => b.confidence - a.confidence),
      overallRisk: maxSeverity,
      confidence: maxConfidence,
      sourceCount: sources.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in ensemble prediction:', error.message);
    throw error;
  }
}

/**
 * Predict hazard from INCOIS structured data
 */
async function predictHazardFromINCOISData(incoisData) {
  // Convert structured data to text for NLP processing
  const textDescription = `
    Ocean conditions: Wave height ${incoisData.waveHeight || 0}m, 
    Sea surface temperature ${incoisData.seaSurfaceTemp || 0}°C,
    Current speed ${incoisData.currentSpeed || 0}m/s,
    Wind speed ${incoisData.windSpeed || 0}m/s.
    ${incoisData.tsunamiWarnings?.activeWarnings.length > 0 ? 'Active tsunami warnings.' : ''}
    ${incoisData.cycloneData?.activeCyclones.length > 0 ? 'Active cyclones detected.' : ''}
  `;

  return await predictHazardFromText(textDescription, {
    waveHeight: incoisData.waveHeight,
    seaSurfaceTemp: incoisData.seaSurfaceTemp,
    windSpeed: incoisData.windSpeed
  });
}

/**
 * Store prediction results for model improvement
 */
async function storePrediction(prediction, actualOutcome = null) {
  try {
    await db.collection('hazardPredictions').add({
      prediction,
      actualOutcome,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing prediction:', error.message);
  }
}

/**
 * Helper function to get most common value
 */
function getMostCommon(arr) {
  const counts = {};
  arr.forEach(val => {
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

module.exports = {
  predictHazardFromText,
  analyzeHazardSentiment,
  extractEntities,
  predictHazardFromMultipleSources,
  predictHazardFromINCOISData,
  storePrediction
};

