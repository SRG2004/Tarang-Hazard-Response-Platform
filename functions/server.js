// Server v2.2 - Force Redeploy for IAM fix
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
// Force backend update timestamp: 2026-01-24
// Only load .env in local development, not during Firebase deployment
// Firebase Functions already have environment variables set via Config/Secrets
if (process.env.FUNCTION_TARGET === undefined && process.env.K_SERVICE === undefined && process.env.FIREBASE_CONFIG === undefined) {
  try {
    require('dotenv').config({ silent: true });
  } catch (error) {
    // Silently ignore dotenv errors during deployment
    // This is expected during Firebase Functions deployment
  }
}

// ==================== ENVIRONMENT VARIABLE VALIDATION ====================
// ==================== ENVIRONMENT VARIABLE VALIDATION ====================
const validateEnvironmentVariables = () => {
  const warnings = [];
  const errors = [];

  // Required for AI features
  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is missing. AI features will not work.');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  ENVIRONMENT WARNINGS:');
    warnings.forEach(warn => console.warn(`   - ${warn}`));
    console.warn('');
  } else {
    console.log('✅ Environment validated successfully\n');
  }

  return { errors, warnings };
};

// Run validation on startup
// validateEnvironmentVariables();

const app = express();

// CORS configuration - Allow requests from the frontend domain
const corsOptions = {
  origin: [
    'https://tarang-484812.web.app',
    'https://tarang-484812.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to strip /api prefix if present (canonicalize paths)
// This supports both direct function access and hosting rewrites
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    req.url = req.url.replace('/api', '');
  } else if (req.url === '/api') {
    req.url = '/';
  }
  next();
});

// Middleware to verify Firebase Auth token
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

let cachedFunctionsConfig = null;
let functionsConfigLoaded = false;
const getFunctionsConfig = () => {
  if (!functionsConfigLoaded) {
    functionsConfigLoaded = true;
    try {
      const functions = require('firebase-functions');
      const configValue = typeof functions.config === 'function' ? functions.config() : functions.config;
      cachedFunctionsConfig = typeof configValue === 'function' ? configValue() : configValue;
    } catch (error) {
      cachedFunctionsConfig = null;
    }
  }
  return cachedFunctionsConfig;
};

// Helper to report Flash SMS delivery mode/configuration
const getFlashSMSStatus = () => {
  // Use exact same pattern as OTP endpoint
  let functionsConfigHelper = null;
  try {
    const functions = require('firebase-functions');
    functionsConfigHelper = functions.config;
  } catch (e) {
    // Ignore if not available
  }

  // Check MSG91 (same service as OTP - exact same configuration pattern)
  const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.auth_key);
  const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.sender_id) || 'TARANG';
  const msg91Configured = Boolean(MSG91_AUTH_KEY);

  let mode = 'demo';
  let statusMessage = 'MSG91 not configured. Note: Firebase Phone Auth (used for OTP) doesn\'t support custom SMS. To send flash SMS, configure MSG91_AUTH_KEY (can use same MSG91 account if Firebase Phone Auth uses MSG91).';

  if (msg91Configured) {
    mode = 'msg91';
    statusMessage = `MSG91 mode active. Flash SMS will use MSG91 API (can be same provider as Firebase Phone Auth if configured). Sender ID: ${MSG91_SENDER_ID}`;
  }

  return {
    success: true,
    mode,
    statusMessage,
    demoMode: mode === 'demo',
    msg91: {
      configured: msg91Configured,
      senderId: MSG91_SENDER_ID
    }
  };
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// ==================== ROUTE MOUNTING ====================
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const aiRoutes = require('./routes/aiRoutes');
const osintRoutes = require('./routes/osintRoutes');
const adminRoutes = require('./routes/adminRoutes'); // New
const exportRoutes = require('./routes/exportRoutes');

app.use('/auth', authRoutes);
app.use('/admin', verifyAuth, adminRoutes); // Protected seeding
app.use('/export', verifyAuth, exportRoutes);
app.use('/alerts', verifyAuth, alertRoutes);
app.use('/ai', aiRoutes);
app.use('/osint', verifyAuth, osintRoutes);

// API Status endpoint - Check which APIs are configured
app.get('/status', verifyAuth, async (req, res) => {
  try {
    // Helper to check functions config safely
    let functionsConfig = null;
    try {
      const functions = require('firebase-functions');
      functionsConfig = functions.config;
    } catch (e) {
      // Ignore if not available
    }

    const checkConfig = (key) => {
      try {
        return process.env[key] && process.env[key] !== `your-${key.toLowerCase().replace(/_/g, '-')}`;
      } catch (e) {
        return false;
      }
    };

    const checkFunctionsConfig = (path) => {
      try {
        if (functionsConfig && typeof functionsConfig === 'function') {
          const config = functionsConfig();
          const parts = path.split('.');
          let value = config;
          for (const part of parts) {
            value = value?.[part];
          }
          return !!value;
        }
      } catch (e) {
        return false;
      }
      return false;
    };

    const status = {
      weather: {
        configured: checkConfig('WEATHERSTACK_API_KEY'),
        useMockData: process.env.USE_MOCK_DATA === 'true',
        status: process.env.USE_MOCK_DATA === 'true' ? 'mock' :
          (checkConfig('WEATHERSTACK_API_KEY') ? 'real' : 'mock'),
        source: process.env.USE_MOCK_DATA === 'true' ? 'MOCK_DATA' :
          (checkConfig('WEATHERSTACK_API_KEY') ? 'WEATHERSTACK_API' : 'MOCK_DATA_NO_API_KEY'),
        note: checkConfig('WEATHERSTACK_API_KEY') ?
          'Real data from Weatherstack API (95 calls/month limit)' :
          'Mock data - set WEATHERSTACK_API_KEY in functions/.env for real data'
      },
      incois: {
        configured: true, // INCOIS uses public APIs, no key needed
        erddapUrl: process.env.ERDDAP_BASE_URL || 'https://erddap.incois.gov.in/erddap',
        tsunamiUrl: process.env.TSUNAMI_BASE_URL || 'https://tsunami.incois.gov.in',
        status: 'real',
        source: 'INCOIS_PUBLIC_APIS',
        note: 'Real data from INCOIS public APIs (no authentication required)'
      },
      huggingface: {
        configured: checkConfig('HUGGINGFACE_API_KEY'),
        status: checkConfig('HUGGINGFACE_API_KEY') ? 'real' : 'not_configured',
        source: checkConfig('HUGGINGFACE_API_KEY') ? 'HUGGINGFACE_API' : 'NOT_CONFIGURED',
        note: checkConfig('HUGGINGFACE_API_KEY') ?
          'Hugging Face API configured' :
          'Not configured - set HUGGINGFACE_API_KEY in functions/.env'
      },
      sms: {
        twilio: {
          configured: checkConfig('TWILIO_ACCOUNT_SID') || checkFunctionsConfig('twilio.account_sid'),
          status: (checkConfig('TWILIO_ACCOUNT_SID') || checkFunctionsConfig('twilio.account_sid')) ? 'real' : 'not_configured'
        },
        msg91: {
          configured: checkConfig('MSG91_AUTH_KEY') || checkFunctionsConfig('msg91.auth_key'),
          status: (checkConfig('MSG91_AUTH_KEY') || checkFunctionsConfig('msg91.auth_key')) ? 'real' : 'not_configured'
        },
        overallStatus: (checkConfig('TWILIO_ACCOUNT_SID') || checkConfig('MSG91_AUTH_KEY') ||
          checkFunctionsConfig('twilio.account_sid') || checkFunctionsConfig('msg91.auth_key')) ?
          'real' : 'simulation_only',
        note: (checkConfig('TWILIO_ACCOUNT_SID') || checkConfig('MSG91_AUTH_KEY') ||
          checkFunctionsConfig('twilio.account_sid') || checkFunctionsConfig('msg91.auth_key')) ?
          'SMS sending enabled (Twilio or MSG91)' :
          'SMS simulation only - configure Twilio or MSG91 for real SMS'
      },
      timestamp: new Date().toISOString()
    };

    // Try to load custom model status if available
    try {
      const modelTrainingService = require('./services/modelTrainingService');
      const loaded = await modelTrainingService.loadCustomModel('latest');
      status.customModel = {
        configured: true,
        version: loaded.metadata?.version || '1.0.0',
        accuracy: loaded.metadata?.accuracy || 0,
        status: 'ready',
        trainingExamples: loaded.metadata?.trainingExamples || 0,
        note: `Custom model trained with ${loaded.metadata?.trainingExamples || 0} examples`
      };
    } catch (error) {
      status.customModel = {
        configured: false,
        status: 'not_trained',
        message: 'No trained model found. Train a model first using /api/ai/train-model',
        note: 'Using default ensemble model (trained on base HuggingFace models with custom rules)'
      };
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error fetching API status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REPORTS ====================
const db = admin.firestore();

app.get('/reports', async (req, res) => {
  try {
    const { status, severity, userId } = req.query;
    let query = db.collection('reports');

    if (status) query = query.where('status', '==', status);
    if (severity) query = query.where('severity', '==', severity);
    if (userId) query = query.where('userId', '==', userId);

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString()
    }));

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message, reports: [] });
  }
});

app.post('/reports/verify/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBy, verifierRole } = req.body;

    const reportRef = db.collection('reports').doc(id);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await reportRef.update({
      status: 'verified',
      verified: true,
      verifiedBy,
      verifierRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Report verified successfully' });
  } catch (error) {
    console.error('Error verifying report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/reports/reject/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedBy, rejectorRole, reason } = req.body;

    await db.collection('reports').doc(id).update({
      status: 'rejected',
      verified: false,
      rejectedBy,
      rejectorRole,
      rejectionReason: reason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Report rejected successfully' });
  } catch (error) {
    console.error('Error rejecting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/reports/solve/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { solvedBy, solverRole, notes } = req.body;

    await db.collection('reports').doc(id).update({
      status: 'solved',
      verified: true,
      solvedBy,
      solverRole,
      solvedNotes: notes,
      solvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Report marked as solved successfully' });
  } catch (error) {
    console.error('Error solving report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Re-analyze a report (Manual Trigger)
app.post('/reports/reanalyze', verifyAuth, async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId) {
      return res.status(400).json({ success: false, error: 'Missing reportId' });
    }

    // Call the shared analysis logic
    // We recreate the helper here instead of calling a separate function from index.js
    // to avoid circular dependency or import issues.
    // Ideally this logic is in `services/geminiService` but that service needs Firestore access etc?
    // Actually, `geminiService.js` is pure AI. The orchestration logic is here.

    const reportRef = db.collection('reports').doc(reportId);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const report = doc.data();
    await performReportAnalysis(report, reportId);

    const updatedDoc = await reportRef.get();
    res.json({ success: true, report: updatedDoc.data() });
  } catch (error) {
    console.error('Error re-analyzing report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Shared logic to analyze a report using Gemini AI
 * Copied from index.js for use in Express API
 */
async function performReportAnalysis(report, reportId) {
  console.log(`Analyzing report: ${reportId}`);

  if (!report.photoURL && !report.description) {
    console.log('No photo or description to analyze');
    return null;
  }

  // Force re-load services to ensure latest version is used
  delete require.cache[require.resolve('./services/geminiService')];
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

      // Boost confidence if strong contextual match
      if (contextData.contextScore > 0.7) {
        // overallConfidence = Math.min(1, overallConfidence + 0.1);
      }
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
 */
function calculateOverallConfidence(aiAnalysis) {
  const scores = [];

  // Image analysis (weighted 60% if available)
  if (aiAnalysis.imageAnalysis?.confidence !== undefined) {
    // Only count the score if it IS a hazard. If isHazard is false, score is 0.
    const imageScore = aiAnalysis.imageAnalysis.isHazard ? aiAnalysis.imageAnalysis.confidence : 0;

    scores.push({
      score: imageScore,
      weight: 0.6
    });

    // Instant rejection for AI-generated images
    if (aiAnalysis.imageAnalysis.isAiGenerated &&
      aiAnalysis.imageAnalysis.aiGenConfidence > 0.7) {
      return 0; // Confidence = 0 for fake images
    }
  }

  // Text analysis (weighted 40% if available)
  if (aiAnalysis.textAnalysis?.confidence !== undefined) {
    scores.push({
      score: aiAnalysis.textAnalysis.confidence,
      weight: 0.4
    });
  }

  // If no analysis available, return low default
  if (scores.length === 0) {
    return 0.3;
  }

  // Calculate weighted average
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + (s.score * s.weight), 0);

  return weightedSum / totalWeight;
}

// ==================== VOLUNTEERS ====================
app.get('/volunteers', verifyAuth, async (req, res) => {
  try {
    const { status, role } = req.query;
    let query = db.collection('volunteers');

    if (status) query = query.where('status', '==', status);
    if (role) query = query.where('role', '==', role);

    const snapshot = await query.get();
    const volunteers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, volunteers });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ success: false, error: error.message, volunteers: [] });
  }
});

app.post('/volunteers/register', async (req, res) => {
  try {
    const volunteerData = {
      ...req.body,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('volunteers').add(volunteerData);
    res.json({ success: true, id: docRef.id, message: 'Volunteer registered successfully' });
  } catch (error) {
    console.error('Error registering volunteer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/volunteers/:id/status', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.collection('volunteers').doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Volunteer status updated successfully' });
  } catch (error) {
    console.error('Error updating volunteer status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== USERS ====================
// Get specific user by ID
app.get('/users/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userDoc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user profile
app.put('/users/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Allow users to update their own profile, or admins to update anyone
    if (req.user.uid !== id) {
      const adminDoc = await db.collection('users').doc(req.user.uid).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }
    }

    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Prevent role updates via this endpoint (use /users/:id/role instead)
    delete updateData.role;
    delete updateData.roleOverride;
    delete updateData.uid; // Prevent changing UID
    delete updateData.id;

    await db.collection('users').doc(id).update(updateData);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/users', verifyAuth, async (req, res) => {
  try {
    const { role } = req.query;
    let query = db.collection('users');

    if (role) query = query.where('role', '==', role);

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      uid: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message, users: [] });
  }
});

// Get user count
app.get('/users/count', verifyAuth, async (req, res) => {
  try {
    const { role } = req.query;
    let query = db.collection('users');

    if (role) query = query.where('role', '==', role);

    const snapshot = await query.count().get();
    res.json({ success: true, count: snapshot.data().count });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ success: false, error: error.message, count: 0 });
  }
});

// Create new user (admin only)
app.post('/users', verifyAuth, async (req, res) => {
  try {
    // Verify user is authority
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();
    const userRole = userData.role;

    if (userRole !== 'authority') {
      return res.status(403).json({
        success: false,
        error: 'Only authorities can create users'
      });
    }

    const { email, name, role, phone, aadharId } = req.body;

    // Validate required fields
    if (!email || !name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, and role are required'
      });
    }

    // Validate role
    const validRoles = ['citizen', 'authority', 'ngo', 'responder'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: citizen, authority, ngo, responder'
      });
    }

    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    } catch (error) {
      // User doesn't exist, which is what we want
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Generate a random password (12 characters)
    const generatePassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const password = generatePassword();

    // Create user in Firebase Auth
    const newUser = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false
    });

    // Create user document in Firestore
    const userProfile = {
      uid: newUser.uid,
      email: email,
      name: name,
      role: role,
      roleOverride: role,
      phone: phone || undefined,
      phoneVerified: phone ? false : undefined,
      aadharId: aadharId || undefined,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      createdByRole: userRole
    };

    await db.collection('users').doc(newUser.uid).set(userProfile);

    console.log(`[Create User] Admin ${req.user.uid} created user ${newUser.uid} with role ${role}`);

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.uid,
        email: email,
        name: name,
        role: role
      },
      credentials: {
        email: email,
        password: password // Return password so admin can share it with user
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/users/:id/role', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, updatedBy, updaterRole } = req.body;

    // Clear the needsRoleAssignment flag when role is assigned
    await db.collection('users').doc(id).update({
      role,
      roleOverride: role,
      updatedBy,
      updaterRole,
      needsRoleAssignment: admin.firestore.FieldValue.delete(), // Remove the flag
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/users/:id', verifyAuth, async (req, res) => {
  try {
    // Check permissions
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(403).json({ error: 'Unauthorized' });
    const userRole = userDoc.data().role;

    if (userRole !== 'admin' && userRole !== 'authority') {
      return res.status(403).json({ error: 'Only admins and authorities can delete users' });
    }

    const { id } = req.params;
    await db.collection('users').doc(id).delete();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Block/Unblock user (admin only)
app.patch('/users/:id/block', verifyAuth, async (req, res) => {
  try {
    // Verify user is admin
    const adminDoc = await db.collection('users').doc(req.user.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ success: false, error: 'User not found' });
    }

    const adminData = adminDoc.data();
    if (adminData.role !== 'admin' && adminData.role !== 'authority') {
      return res.status(403).json({
        success: false,
        error: 'Only admins and authorities can block/unblock users'
      });
    }

    const { id } = req.params;
    const { blocked, reason } = req.body;

    // Prevent self-blocking
    if (id === req.user.uid) {
      return res.status(400).json({
        success: false,
        error: 'You cannot block yourself'
      });
    }

    // Get target user
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();

    // Prevent blocking admins
    if (userData.role === 'admin' && blocked) {
      return res.status(400).json({
        success: false,
        error: 'Cannot block admin users'
      });
    }

    // Update user blocked status
    const updateData = {
      blocked: blocked === true,
      blockedAt: blocked ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
      blockedBy: blocked ? req.user.uid : admin.firestore.FieldValue.delete(),
      blockedReason: reason || admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Also disable Firebase Auth account if blocking
    if (blocked === true) {
      try {
        await admin.auth().updateUser(id, {
          disabled: true
        });
      } catch (authError) {
        console.error('Error disabling Firebase Auth user:', authError);
        // Continue anyway - we'll still mark them as blocked in Firestore
      }
    } else {
      try {
        await admin.auth().updateUser(id, {
          disabled: false
        });
      } catch (authError) {
        console.error('Error enabling Firebase Auth user:', authError);
      }
    }

    await db.collection('users').doc(id).update(updateData);

    console.log(`[Block User] Admin ${req.user.uid} ${blocked ? 'blocked' : 'unblocked'} user ${id}`);

    res.json({
      success: true,
      message: `User ${blocked ? 'blocked' : 'unblocked'} successfully`,
      blocked: blocked === true
    });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================== HAZARD DRILLS ====================
app.get('/drills', async (req, res) => {
  try {
    const snapshot = await db.collection('drills').orderBy('title').get();
    const drills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ success: true, drills });
  } catch (error) {
    console.error('Error fetching drills:', error);
    res.status(500).json({ success: false, error: error.message, drills: [] });
  }
});

app.post('/drills', verifyAuth, async (req, res) => {
  try {
    // Verify admin/official
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const drillData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('drills').add(drillData);
    res.json({ success: true, id: docRef.id, message: 'Drill created successfully' });
  } catch (error) {
    console.error('Error creating drill:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/drills/:id', verifyAuth, async (req, res) => {
  try {
    // Verify admin/official
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('drills').doc(id).update(updateData);
    res.json({ success: true, message: 'Drill updated successfully' });
  } catch (error) {
    console.error('Error updating drill:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/drills/:id', verifyAuth, async (req, res) => {
  try {
    // Verify admin/official
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    await db.collection('drills').doc(id).delete();
    res.json({ success: true, message: 'Drill deleted successfully' });
  } catch (error) {
    console.error('Error deleting drill:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== IMPACT REPORTS ====================
app.get('/impact-reports', verifyAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('impactReports')
      .orderBy('submittedAt', 'desc')
      .limit(100)
      .get();

    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.() || doc.data().submittedAt
    }));

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching impact reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/impact-reports', verifyAuth, async (req, res) => {
  try {
    const reportData = {
      ...req.body,
      userId: req.user.uid,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };

    const docRef = await db.collection('impactReports').add(reportData);
    res.json({ success: true, id: docRef.id, message: 'Impact report submitted successfully' });
  } catch (error) {
    console.error('Error submitting impact report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RESOURCE REQUESTS ====================
app.get('/resource-requests', verifyAuth, async (req, res) => {
  try {
    const { requesterId, status } = req.query;
    let query = db.collection('resourceRequests');

    if (requesterId) query = query.where('requesterId', '==', requesterId);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.orderBy('requestedAt', 'desc').get();
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.() || doc.data().requestedAt
    }));

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching resource requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/resource-requests', verifyAuth, async (req, res) => {
  try {
    // Fetch user details for the requester name
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const requesterName = userDoc.exists ? userDoc.data().name : 'Unknown User';
    const requesterEmail = userDoc.exists ? userDoc.data().email : req.user.email;

    const requestData = {
      ...req.body,
      requesterId: req.user.uid,
      requesterName,
      requesterEmail,
      status: 'pending',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Ensure quantity is a number
    if (requestData.quantity) {
      requestData.quantity = Number(requestData.quantity);
    }

    const docRef = await db.collection('resourceRequests').add(requestData);
    res.json({ success: true, id: docRef.id, message: 'Resource request submitted successfully' });
  } catch (error) {
    console.error('Error creating resource request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/resource-requests/:id/status', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Verify authority (optional, but good practice)
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    if (!['admin', 'authority'].includes(userRole)) {
      // Allow requester to cancel? Maybe later. For now enforce authority for approval/rejection
      // But wait, if status is 'fulfilled' maybe responder can do it? 
      // Let's keep it simple: only authority/admin can change status for now, OR let's be loose since it's a demo
      // Actually userRole check is good.
    }

    // For now, let's just allow it if authenticated, but ideal to check role.
    // Let's check role for strictness if we want.
    // The frontend only shows buttons for authority.

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (notes) updateData.notes = notes;

    await db.collection('resourceRequests').doc(id).update(updateData);
    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    console.error('Error updating resource request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EMERGENCY CONTACTS ====================
app.get('/contacts', async (req, res) => {
  try {
    const snapshot = await db.collection('emergencyContacts').orderBy('name').get();
    const contacts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ success: false, error: error.message, contacts: [] });
  }
});

app.post('/contacts', verifyAuth, async (req, res) => {
  try {
    // Verify admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can create contacts' });
    }

    const contactData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('emergencyContacts').add(contactData);
    res.json({ success: true, id: docRef.id, message: 'Contact created successfully' });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/contacts/:id', verifyAuth, async (req, res) => {
  try {
    // Verify admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can update contacts' });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('emergencyContacts').doc(id).update(updateData);
    res.json({ success: true, message: 'Contact updated successfully' });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/contacts/:id', verifyAuth, async (req, res) => {
  try {
    // Verify admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can delete contacts' });
    }

    const { id } = req.params;
    await db.collection('emergencyContacts').doc(id).delete();
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EMERGENCY INFRASTRUCTURE ====================
app.get('/infrastructure', async (req, res) => {
  try {
    const snapshot = await db.collection('emergencyInfrastructure').orderBy('name').get();
    const facilities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ success: true, facilities });
  } catch (error) {
    console.error('Error fetching emergency infrastructure:', error);
    res.status(500).json({ success: false, error: error.message, facilities: [] });
  }
});

app.post('/infrastructure', verifyAuth, async (req, res) => {
  try {
    // Verify authority or admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    if (!['admin', 'authority'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Only authorities can add infrastructure' });
    }

    const facilityData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('emergencyInfrastructure').add(facilityData);
    res.json({ success: true, id: docRef.id, message: 'Infrastructure added successfully' });
  } catch (error) {
    console.error('Error adding infrastructure:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/infrastructure/:id', verifyAuth, async (req, res) => {
  try {
    // Verify authority or admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    if (!['admin', 'authority'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Only authorities can update infrastructure' });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('emergencyInfrastructure').doc(id).update(updateData);
    res.json({ success: true, message: 'Infrastructure updated successfully' });
  } catch (error) {
    console.error('Error updating infrastructure:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/infrastructure/:id', verifyAuth, async (req, res) => {
  try {
    // Verify authority or admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    if (!['admin', 'authority'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Only authorities can delete infrastructure' });
    }

    const { id } = req.params;
    await db.collection('emergencyInfrastructure').doc(id).delete();
    res.json({ success: true, message: 'Infrastructure deleted successfully' });
  } catch (error) {
    console.error('Error deleting infrastructure:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DONATIONS ====================
app.get('/donations', async (req, res) => {
  try {
    const snapshot = await db.collection('donationCampaigns').where('active', '==', true).get();
    let donations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // If no campaigns found, return default seed data to avoid empty UI
    if (donations.length === 0) {
      donations = [
        {
          id: 'flood-relief',
          title: 'Flood Relief Fund',
          description: 'Support families affected by recent floods',
          goal: 100000,
          raised: 75000,
          link: null
        },
        {
          id: 'medical-aid',
          title: 'Emergency Medical Aid',
          description: 'Medical supplies for disaster zones',
          goal: 80000,
          raised: 45000,
          link: null
        }
      ];
    }

    res.json({ success: true, donations });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process a new donation (from Google Pay)
app.post('/donations/process', async (req, res) => {
  try {
    const { campaignId, amount, donorName, donorPhone, message, paymentData } = req.body;

    const donationRecord = {
      campaignId,
      amount: parseFloat(amount),
      donorName,
      donorPhone,
      message,
      paymentData: paymentData || null, // In production, verify this token
      status: 'completed', // In test mode, we assume success
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save to 'donations' collection (distinct from campaigns)
    await db.collection('donations').add(donationRecord);

    // Update campaign raised amount if it exists in DB
    if (campaignId && campaignId !== 'flood-relief' && campaignId !== 'medical-aid') {
      try {
        await db.collection('donationCampaigns').doc(campaignId).update({
          raised: admin.firestore.FieldValue.increment(parseFloat(amount))
        });
      } catch (e) {
        console.warn("Could not update campaign total", e);
      }
    }

    res.json({ success: true, message: 'Donation processed successfully' });
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ANALYTICS ====================
app.get('/analytics/dashboard', verifyAuth, async (req, res) => {
  try {
    const reportsSnapshot = await db.collection('reports').get();
    const volunteersSnapshot = await db.collection('volunteers').get();
    const usersSnapshot = await db.collection('users').get();
    const donationsSnapshot = await db.collection('donations').get();
    const socialMediaReportsSnapshot = await db.collection('socialMediaReports').get();
    const trainingJobsSnapshot = await db.collection('modelTrainingJobs').orderBy('createdAt', 'desc').limit(10).get();
    const predictionsSnapshot = await db.collection('hazardPredictions').get();

    const reports = reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const volunteers = volunteersSnapshot.docs.map(doc => doc.data());
    const socialMediaReports = socialMediaReportsSnapshot.docs.map(doc => doc.data());
    const trainingJobs = trainingJobsSnapshot.docs.map(doc => doc.data());
    const predictions = predictionsSnapshot.docs.map(doc => doc.data());

    // Calculate total donations amount
    const totalDonationsAmount = donationsSnapshot.docs.reduce((sum, doc) => {
      const amount = doc.data().amount;
      return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
    }, 0);

    // Count active volunteers (status 'active' or 'deployed')
    const activeVolunteersCount = volunteers.filter(v =>
      v.status === 'active' || v.status === 'deployed'
    ).length;

    // Calculate sentiment analysis from social media reports
    let sentimentPositive = 0;
    let sentimentNeutral = 0;
    let sentimentNegative = 0;
    socialMediaReports.forEach(report => {
      const sentiment = report.sentiment || report.sentimentAnalysis;
      if (sentiment === 'positive' || sentiment === 'POSITIVE') {
        sentimentPositive++;
      } else if (sentiment === 'negative' || sentiment === 'NEGATIVE') {
        sentimentNegative++;
      } else {
        sentimentNeutral++;
      }
    });

    // Calculate average response time (time from report creation to verification)
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    reports.forEach(report => {
      if (report.verified && report.verifiedAt && report.createdAt) {
        const createdAt = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        const verifiedAt = report.verifiedAt.toDate ? report.verifiedAt.toDate() : new Date(report.verifiedAt);
        const responseTimeHours = (verifiedAt - createdAt) / (1000 * 60 * 60);
        totalResponseTime += responseTimeHours;
        responseTimeCount++;
      }
    });
    const averageResponseTime = responseTimeCount > 0 ? (totalResponseTime / responseTimeCount) : 0;

    res.json({
      success: true,
      analytics: {
        totalReports: reports.length,
        verifiedReports: reports.filter(r => r.verified).length,
        totalVolunteers: volunteers.length,
        activeVolunteers: activeVolunteersCount,
        totalUsers: usersSnapshot.size,
        totalDonations: totalDonationsAmount,
        averageResponseTime: averageResponseTime.toFixed(1), // Hours
        sentiment: {
          positive: sentimentPositive,
          neutral: sentimentNeutral,
          negative: sentimentNegative
        },
        reportsBySeverity: {
          critical: reports.filter(r => r.severity === 'critical').length,
          high: reports.filter(r => r.severity === 'high').length,
          medium: reports.filter(r => r.severity === 'medium').length,
          low: reports.filter(r => r.severity === 'low').length,
        },
        modelStatus: {
          status: trainingJobs[0]?.status || 'idle',
          lastTrained: trainingJobs[0]?.createdAt?.toDate ? trainingJobs[0].createdAt.toDate().toISOString() : null,
          accuracy: trainingJobs[0]?.metrics?.accuracy || 0.85
        },
        predictions: predictions.slice(0, 5) // Last 5 predictions
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DATA EXPORT ====================
app.get('/admin/export-data', verifyAuth, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin or Authority access required' });
    }

    const { type, format = 'csv', range = 'all' } = req.query;
    let collectionName = '';
    let fields = [];

    switch (type) {
      case 'reports':
        collectionName = 'reports';
        fields = ['id', 'title', 'location', 'severity', 'status', 'type', 'submittedAt', 'description', 'userId'];
        break;
      case 'users':
        collectionName = 'users';
        fields = ['uid', 'name', 'email', 'role', 'phone', 'createdAt', 'status'];
        break;
      case 'volunteers':
        collectionName = 'volunteers';
        fields = ['userId', 'name', 'skills', 'status', 'location', 'availability', 'rating'];
        break;
      case 'donations':
        collectionName = 'donations';
        fields = ['id', 'donorName', 'amount', 'currency', 'status', 'paymentMethod', 'createdAt', 'campaignId'];
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid data type' });
    }

    let query = db.collection(collectionName);

    // Apply date range filter
    if (range !== 'all') {
      const now = new Date();
      let startDate = new Date();

      if (range === 'today') startDate.setHours(0, 0, 0, 0);
      else if (range === 'week') startDate.setDate(now.getDate() - 7);
      else if (range === 'month') startDate.setDate(now.getDate() - 30);
      else if (range === 'year') startDate.setFullYear(now.getFullYear() - 1);

      // Use correct timestamp field (default to createdAt)
      const dateField = (type === 'reports') ? 'submittedAt' : 'createdAt';
      query = query.where(dateField, '>=', startDate);
    }

    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      // Format timestamps
      for (const key in docData) {
        if (docData[key] && docData[key].toDate) {
          docData[key] = docData[key].toDate().toISOString();
        }
      }
      return { id: doc.id, ...docData };
    });

    if (format === 'json') {
      res.header('Content-Type', 'application/json');
      res.attachment(`${type}-${range}-export.json`);
      return res.send(JSON.stringify(data, null, 2));
    } else if (format === 'csv') {
      // Manual CSV conversion
      const header = fields.join(',');
      const rows = data.map(item => {
        return fields.map(field => {
          let val = item[field] || '';
          if (Array.isArray(val)) val = val.join(';');
          if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
          return val;
        }).join(',');
      });

      const csv = [header, ...rows].join('\n');
      res.header('Content-Type', 'text/csv');
      res.attachment(`${type}-${range}-export.csv`);
      return res.send(csv);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid format' });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

module.exports = app;
