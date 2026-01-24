const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions/v1'); // Use v1 for legacy triggers
const admin = require('firebase-admin');

// Only load .env in local development
if (process.env.FUNCTION_TARGET === undefined && process.env.K_SERVICE === undefined) {
  try {
    require('dotenv').config();
  } catch (error) {
    console.warn('Could not load .env file (normal in production):', error.message);
  }
}

// Initialize Firebase Admin SDK once
if (!admin.apps || admin.apps.length === 0) {
  try {
    admin.initializeApp();
    console.log('Firebase Admin initialized');
  } catch (err) {
    console.error('Firebase Admin init failed:', err);
  }
}

// Import Express App
const app = require('./server');

// Export API (V2 with public access)
exports.apiV2 = onRequest({ cors: true, invoker: 'public', maxInstances: 10 }, app);

// Keep the Report Analysis Trigger (Gemini AI) as it is a core new feature
exports.analyzeReport = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snap, context) => {
    // We can reuse the shared logic from server if we export it, 
    // OR just keep the duplicate logic here for the Trigger to minimize refactoring risk.
    // For now, I will keep the logic here to ensure the Trigger continues to work 
    // exactly as before without breaking dependencies.
    // Ideally, we refactor `performReportAnalysis` into a separate service file.

    // Actually, to avoid code duplication and divergence, let's keep it simple:
    // The trigger can call the same logic. But `server.js` isn't designed to export functions easily.
    // I will duplicate the logic in `server.js` (done) and keep the original logic here for the trigger.
    // This is less dry but safer for immediate fix. 
    // Wait, I already removed the logic in previous steps? No, I failed to remove it.

    const report = snap.data();
    const reportId = context.params.reportId;
    console.log(`Analyzing new report: ${reportId}`);

    if (!report.photoURL && !report.description) {
      console.log('No photo or description to analyze');
      return null;
    }

    const geminiService = require('./services/geminiService');
    const axios = require('axios');

    try {
      let aiAnalysis = {
        analyzedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // 1. Image Analysis
      if (report.photoURL) {
        try {
          console.log(`Fetching image from: ${report.photoURL}`);
          const imageResponse = await axios.get(report.photoURL, { responseType: 'arraybuffer' });
          const imageBase64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
          const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

          console.log('Sending image to Gemini for analysis...');
          const imageAnalysis = await geminiService.analyzeImage(
            imageBase64,
            mimeType,
            report.description || report.title || ''
          );

          console.log('Gemini Image Analysis:', imageAnalysis);
          aiAnalysis.imageAnalysis = imageAnalysis;

          if (imageAnalysis.isHazard && imageAnalysis.confidence > 0.8) {
            aiAnalysis.autoFlagged = true;
            aiAnalysis.flagReason = 'High confidence AI detection from image';
          }

          if (imageAnalysis.isAiGenerated && imageAnalysis.aiGenConfidence > 0.7) {
            aiAnalysis.isFake = true;
            aiAnalysis.autoFlagged = true;
            aiAnalysis.flagReason = `Potential AI-generated/Fake Image (${Math.round(imageAnalysis.aiGenConfidence * 100)}% confidence).`;
            console.log(`⚠️ Alert: AI-generated image detected for report ${reportId}`);
          }
        } catch (imgError) {
          console.error('Error analyzing report image:', imgError);
          aiAnalysis.imageError = imgError.message;
        }
      }

      // 2. Text Analysis
      if (report.description && (!aiAnalysis.imageAnalysis || !aiAnalysis.imageAnalysis.isHazard)) {
        try {
          console.log('Analyzing report text...');
          const textAnalysis = await geminiService.analyzeHazardContext(
            `${report.title}\n${report.description}`,
            'user_report'
          );
          console.log('Gemini Text Analysis:', textAnalysis);
          aiAnalysis.textAnalysis = textAnalysis;
        } catch (txtError) {
          console.error('Error analyzing report text:', txtError);
          aiAnalysis.textError = txtError.message;
        }
      }

      // 3. Calculate Overall Confidence Score
      const overallConfidence = calculateOverallConfidence(aiAnalysis);
      console.log(`Overall confidence score: ${overallConfidence}`);

      // 4. Auto-Flagging Logic (Instead of Rejection)
      let needsReview = true;
      let reviewReason = '';

      if (overallConfidence < 0.5) {
        console.log(`⚠️ Low confidence report ${reportId}: ${overallConfidence}. Flagging for review.`);
        aiAnalysis.autoFlagged = true;
        aiAnalysis.flagReason = `Low AI confidence (${Math.round(overallConfidence * 100)}%). Manual verification required.`;
        reviewReason = 'Low AI Confidence';
      }

      // Gather Contextual Intelligence for ALL reports
      console.log(`Gathering context for report ${reportId}...`);
      let contextData = null;

      try {
        const contextualIntelligence = require('./services/contextualIntelligence');
        contextData = await contextualIntelligence.gatherContext(report, aiAnalysis);
        console.log(`Context score: ${contextData.contextScore}`);

        if (contextData.contextScore > 0.7) {
          // context boost logic
        }
      } catch (contextError) {
        console.error('Context gathering failed:', contextError);
      }

      const isAutoVerified = overallConfidence > 0.95 && !aiAnalysis.autoFlagged;

      await admin.firestore().collection('reports').doc(reportId).update({
        status: isAutoVerified ? 'verified' : 'pending',
        aiAnalysis: aiAnalysis,
        confidenceScore: overallConfidence,
        contextualData: contextData,
        requiresAuthorityReview: !isAutoVerified,
        autoFlagged: aiAnalysis.autoFlagged || false,
        flagReason: aiAnalysis.flagReason || reviewReason,
        analyzedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Report ${reportId} analysis complete.`);
      return null;
    } catch (error) {
      console.error(`Error in analyzeReport trigger for ${reportId}:`, error);
      return null;
    }
  });

/* Helper function for the trigger */
function calculateOverallConfidence(aiAnalysis) {
  const scores = [];
  if (aiAnalysis.imageAnalysis?.confidence !== undefined) {
    const imageScore = aiAnalysis.imageAnalysis.isHazard ? aiAnalysis.imageAnalysis.confidence : 0;
    scores.push({ score: imageScore, weight: 0.6 });
    if (aiAnalysis.imageAnalysis.isAiGenerated && aiAnalysis.imageAnalysis.aiGenConfidence > 0.7) return 0;
  }
  if (aiAnalysis.textAnalysis?.confidence !== undefined) {
    scores.push({ score: aiAnalysis.textAnalysis.confidence, weight: 0.4 });
  }
  if (scores.length === 0) return 0.3;
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + (s.score * s.weight), 0);
  return weightedSum / totalWeight;
}

// Google Sheets Integration - Sync donations
exports.syncDonationToSheets = functions.firestore
  .document('donations/{donationId}')
  .onCreate(async (snap, context) => {
    const sheetsService = require('./services/sheetsService');
    try {
      console.log(`Syncing donation ${context.params.donationId} to Google Sheets`);
      const result = await sheetsService.onDonationCreated(snap, context);
      if (result.success) {
        console.log('Donation synced successfully');
      } else {
        console.warn('Donation sync failed:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Error in syncDonationToSheets trigger:', error);
      return { success: false, error: error.message };
    }
  });
