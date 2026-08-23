const admin = require('firebase-admin');
const axios = require('axios');
const geminiService = require('./geminiService');
const contextualIntelligence = require('./contextualIntelligence');

/**
 * Shared logic to analyze a report using Gemini AI
 * Extracts image and text context, assesses confidence, and updates Firestore.
 */
async function performReportAnalysis(report, reportId) {
  const db = admin.firestore();
  console.log(`Analyzing report: ${reportId}`);

  if (!report.photoURL && !report.description) {
    console.log('No photo or description to analyze');
    return null;
  }

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

    // 2. Text Analysis - Always analyze text (not just when no image)
    if (report.description) {
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

    // Track if image was provided for confidence capping
    aiAnalysis.hasImage = !!report.photoURL;

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
      contextData = await contextualIntelligence.gatherContext(report, aiAnalysis);
      console.log(`Context score: ${contextData.contextScore}`);
    } catch (contextError) {
      console.error('Context gathering failed:', contextError);
    }

    // Allow instant verification only if confidence is VERY high and context supports it
    const isAutoVerified = overallConfidence > 0.95 && !aiAnalysis.autoFlagged;

    await db.collection('reports').doc(reportId).update({
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
    console.error(`Error in performReportAnalysis for ${reportId}:`, error);
    return null;
  }
}

/**
 * Calculate weighted overall confidence score
 * When no image is attached, confidence is capped at 50% max
 */
function calculateOverallConfidence(aiAnalysis) {
  const scores = [];
  const hasImage = aiAnalysis.hasImage === true;

  // Image analysis (weighted 60% if available)
  if (hasImage && aiAnalysis.imageAnalysis?.confidence !== undefined) {
    const imageScore = aiAnalysis.imageAnalysis.isHazard ? aiAnalysis.imageAnalysis.confidence : 0;
    scores.push({ score: imageScore, weight: 0.6 });

    // Instant rejection for AI-generated images
    if (aiAnalysis.imageAnalysis.isAiGenerated && aiAnalysis.imageAnalysis.aiGenConfidence > 0.7) {
      return 0; // Confidence = 0 for fake images
    }
  }

  // Text analysis (weighted 40% normally, 100% if no image)
  if (aiAnalysis.textAnalysis?.confidence !== undefined) {
    scores.push({
      score: aiAnalysis.textAnalysis.confidence,
      weight: hasImage ? 0.4 : 1.0 // Full weight to text if no image
    });
  }

  // If no analysis available, return low default
  if (scores.length === 0) {
    return 0.3;
  }

  // Calculate weighted average
  let totalScore = 0;
  let totalWeight = 0;
  scores.forEach(s => {
    totalScore += s.score * s.weight;
    totalWeight += s.weight;
  });

  let overallConfidence = totalWeight > 0 ? (totalScore / totalWeight) : 0.3;

  // Cap confidence if no image
  if (!hasImage) {
    overallConfidence = Math.min(0.5, overallConfidence);
  }

  return overallConfidence;
}

module.exports = {
  performReportAnalysis,
  calculateOverallConfidence
};
