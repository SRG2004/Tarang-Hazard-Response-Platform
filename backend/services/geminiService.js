const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Retry wrapper with exponential backoff for handling 429 errors
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default 3)
 * @param {number} initialDelay - Initial delay in ms (default 1000)
 * @returns {Promise} Result of the function
 */
async function withRetry(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRateLimited = error.message?.includes('429') ||
        error.message?.includes('Resource exhausted') ||
        error.message?.includes('Too Many Requests');

      if (!isRateLimited || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Analyze text using Gemini AI to determine if it's related to ocean hazards
 * @param {string} text - The text to analyze
 * @param {string} source - Source of the text (twitter, facebook, youtube, news)
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeHazardContext(text, source = 'social_media') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create the prompt for hazard detection
    const prompt = `You are an AI assistant specialized in identifying ocean and coastal hazards.

Analyze the following ${source} post and determine if it reports or discusses a genuine ocean or coastal hazard.

Ocean/Coastal Hazards include:
- Tsunamis and tidal waves
- Storm surges and high waves
- Coastal flooding
- Abnormal tides
- Rough seas and dangerous swells
- Coastal erosion
- Marine weather warnings
- Cyclones/hurricanes affecting coastal areas
- Rip currents and dangerous surf conditions
- Oil spills or marine pollution affecting coasts
- Coastal infrastructure damage due to ocean conditions

Respond ONLY with a valid JSON object (no markdown, no code blocks, just the JSON):
{
  "isHazard": true/false,
  "confidence": 0.0-1.0,
  "hazardType": "type of hazard or null",
  "severity": "low/medium/high/critical or null",
  "location": "extracted location or null",
  "summary": "brief summary if hazard detected",
  "reasoning": "brief explanation of your decision"
}

Text to analyze:
"""
${text}
"""

Remember: Respond with ONLY valid JSON, nothing else.`;

    // Generate content with retry logic for cold start 429 errors
    const result = await withRetry(async () => {
      return await model.generateContent(prompt);
    });
    const response = await result.response;
    const responseText = response.text();

    // Parse the JSON response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      // Return a default negative result if parsing fails
      return {
        isHazard: false,
        confidence: 0,
        hazardType: null,
        severity: null,
        location: null,
        summary: null,
        reasoning: 'Failed to parse AI response'
      };
    }

    return analysis;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Batch analyze multiple texts for hazards
 * @param {Array} texts - Array of {text, source} objects
 * @returns {Promise<Array>} Array of analysis results
 */
async function batchAnalyzeHazards(texts) {
  const results = [];

  // Process in batches to avoid rate limits
  for (const item of texts) {
    try {
      const analysis = await analyzeHazardContext(item.text, item.source);
      results.push({
        ...item,
        analysis
      });

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error analyzing text from ${item.source}:`, error);
      results.push({
        ...item,
        analysis: {
          isHazard: false,
          confidence: 0,
          error: error.message
        }
      });
    }
  }

  return results;
}

/**
 * Extract location information from text using Gemini
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} Location information
 */
async function extractLocation(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Extract location information from this text about an ocean or coastal event.

Text:
"""
${text}
"""

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "hasLocation": true/false,
  "location": "location name or null",
  "coordinates": {"lat": number, "lng": number} or null,
  "region": "region/state/country or null"
}
`;

    // Generate content with retry logic for cold start 429 errors
    const result = await withRetry(async () => {
      return await model.generateContent(prompt);
    });
    const response = await result.response;
    const responseText = response.text();

    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Location extraction error:', error);
    return {
      hasLocation: false,
      location: null,
      coordinates: null,
      region: null
    };
  }
}

/**
 * Analyze an image using Gemini AI to determine if it's related to ocean hazards
 * @param {string} imageBase64 - Base64 encoded image string
 * @param {string} mimeType - MIME type of the image (e.g., 'image/jpeg')
 * @param {string} textContext - Optional accompanying text
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeImage(imageBase64, mimeType = 'image/jpeg', textContext = '') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an AI assistant specialized in identifying natural disasters and hazards from images.

    Analyze this image to determine if it shows a genuine natural disaster or hazard.
    
    IMPORTANT: Base your decision ONLY on the visual evidence in the image. Ignore any potential external context.
    
    You must classify the image as FALSE (isHazard: false) if it is:
    - A diagram, chart, graph, or infographic (structure like Business Model Canvas, flowcharts).
    - A map or satellite view without visible destruction.
    - A screenshot of text, a document, or a social media post.
    - A meme or clearly edited/fake image.
    - A normal street scene without visible hazards.
    
    Valid Hazards/Disasters include:
    - Landslides, rockfalls, and mudslides
    - Floods and urban waterlogging
    - Fires (wildfires, urban fires)
    - Earthquakes and structural collapse
    - Cyclones, hurricanes, and severe storms
    - Tsunamis and coastal hazards
    - Road accidents or infrastructure damage
    - Industrial accidents
    - Water contamination or pollution

      "isHazard": true/false,
      "confidence": 0.0-1.0,
      "hazardType": "type of hazard or null",
      "severity": "low/medium/high/critical or null",
      "description": "brief description of strictly what is seen in the image",
      "reasoning": "brief explanation. If rejected, explain why (e.g. 'This is a diagram, not a real scene').",
      "isAiGenerated": true/false,
      "aiGenConfidence": 0.0-1.0,
      "manipulationDetails": "if ai generated or manipulated, explain why"
    }`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      },
    };

    const parts = [prompt, imagePart];
    // Text context removed to force visual-only analysis as per user request
    // if (textContext) { ... }

    // Generate content with retry logic for cold start 429 errors
    const result = await withRetry(async () => {
      return await model.generateContent(parts);
    });
    const response = await result.response;
    const responseText = response.text();

    let analysis;
    try {
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      analysis = JSON.parse(cleanedText);

      // CRITICAL FIX: Normalize confidence based on isHazard
      // If AI says it's NOT a hazard, the confidence score for "being a hazard" must be low/zero.
      // Often LLMs return "confidence: 0.9" meaning "90% confident it is SAFE".
      // We need "confidence that it IS a hazard".
      if (analysis.isHazard === false) {
        analysis.confidence = 0;
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini image analysis response:', responseText);
      return {
        isHazard: false,
        confidence: 0,
        hazardType: null,
        severity: null,
        description: null,
        reasoning: 'Failed to parse AI response',
        isAiGenerated: false,
        aiGenConfidence: 0,
        manipulationDetails: null
      };
    }

    return analysis;
  } catch (error) {
    console.error('Gemini Image Analysis API error:', error);
    // Return a safe default
    return {
      isHazard: false,
      confidence: 0,
      error: error.message
    };
  }
}

module.exports = {
  analyzeHazardContext,
  batchAnalyzeHazards,
  extractLocation,
  analyzeImage
};
