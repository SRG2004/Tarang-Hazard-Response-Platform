const admin = require('firebase-admin');
const db = admin.firestore();
const modelTrainingService = require('./modelTrainingService');

/**
 * Automatic Model Training Service
 * 
 * Trains models automatically:
 * 1. Daily at scheduled time (configurable)
 * 2. When enough new training data is available (>10% increase)
 * 3. When model accuracy drops below threshold
 */

const MIN_TRAINING_EXAMPLES = 10;
const MIN_NEW_DATA_PERCENTAGE = 0.1; // 10% increase
const MIN_ACCURACY_THRESHOLD = 0.6; // 60% accuracy

/**
 * Check if automatic training should be triggered
 */
async function shouldTrainModel() {
  try {
    // Get latest model
    const modelDoc = await db.collection('customModels')
      .doc('hazard-predictor-v1')
      .get();

    if (!modelDoc.exists) {
      console.log('No model exists, training new model...');
      return { shouldTrain: true, reason: 'No model exists' };
    }

    const model = modelDoc.data();
    const lastTrainingTime = model.updatedAt?.toDate?.() || model.createdAt?.toDate?.();
    const hoursSinceTraining = lastTrainingTime 
      ? (Date.now() - lastTrainingTime.getTime()) / (1000 * 60 * 60)
      : Infinity;

    // Train if model is older than 24 hours
    if (hoursSinceTraining > 24) {
      console.log(`Model is ${hoursSinceTraining.toFixed(1)} hours old, retraining...`);
      return { shouldTrain: true, reason: `Model is ${hoursSinceTraining.toFixed(1)} hours old` };
    }

    // Check if model accuracy is low
    if (model.accuracy < MIN_ACCURACY_THRESHOLD * 100) {
      console.log(`Model accuracy (${model.accuracy}%) is below threshold, retraining...`);
      return { shouldTrain: true, reason: `Low accuracy: ${model.accuracy}%` };
    }

    // Check if significant new data is available
    const trainingExamples = model.trainingExamples || 0;
    const currentDataCount = await getCurrentDataCount();
    
    if (currentDataCount > trainingExamples * (1 + MIN_NEW_DATA_PERCENTAGE)) {
      const increase = ((currentDataCount - trainingExamples) / trainingExamples * 100).toFixed(1);
      console.log(`New data available (${increase}% increase), retraining...`);
      return { shouldTrain: true, reason: `${increase}% more training data available` };
    }

    console.log('Model is up to date, no training needed');
    return { shouldTrain: false, reason: 'Model is up to date' };
  } catch (error) {
    console.error('Error checking if should train model:', error);
    return { shouldTrain: false, reason: `Error: ${error.message}` };
  }
}

/**
 * Get current count of training data
 */
async function getCurrentDataCount() {
  try {
    // Count verified reports
    const reportsSnapshot = await db.collection('reports')
      .where('verified', '==', true)
      .get();
    
    // Count INCOIS data entries
    const incoisSnapshot = await db.collection('incoisData')
      .get();

    return reportsSnapshot.size + incoisSnapshot.size;
  } catch (error) {
    console.error('Error getting current data count:', error);
    return 0;
  }
}

/**
 * Train model automatically
 */
async function trainModelAutomatically() {
  try {
    console.log('========================================');
    console.log('Starting automatic model training...');
    console.log('========================================');

    // Check if we should train
    const check = await shouldTrainModel();
    if (!check.shouldTrain) {
      console.log(`Skipping training: ${check.reason}`);
      return {
        success: true,
        skipped: true,
        reason: check.reason
      };
    }

    // Create training job record
    const jobRef = db.collection('modelTrainingJobs').doc();
    await jobRef.set({
      status: 'running',
      type: 'automatic',
      reason: check.reason,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      triggeredBy: 'system',
      triggeredByRole: 'system'
    });

    try {
      // Train the model
      const result = await modelTrainingService.trainCustomModel();

      // Update job status
      await jobRef.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        result: {
          version: result.model.version,
          accuracy: result.model.accuracy,
          trainingExamples: result.model.trainingExamples
        },
        duration: Date.now() - (await jobRef.get()).data().startedAt?.toDate?.()?.getTime() || 0
      });

      console.log('Automatic model training completed successfully');
      
      return {
        success: true,
        skipped: false,
        model: result.model,
        accuracy: result.accuracy
      };
    } catch (error) {
      // Update job status with error
      await jobRef.update({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        errorStack: error.stack
      });

      console.error('Automatic model training failed:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in automatic model training:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  shouldTrainModel,
  trainModelAutomatically,
  getCurrentDataCount
};

