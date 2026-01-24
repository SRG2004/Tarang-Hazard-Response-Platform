const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

const db = admin.firestore();

// Generate 6-digit OTP securely
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP via MSG91
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number. Must be 10 digits.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in Firestore
    await db.collection('otp_requests').doc(phone).set({
      code: otp,
      expiresAt,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send OTP via MSG91
    // Helper to check functions config safely
    let functionsConfigHelper = null;
    try {
      const functions = require('firebase-functions');
      functionsConfigHelper = functions.config;
    } catch (e) {
      // Ignore if not available
    }

    const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.auth_key);
    const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.sender_id) || 'TARANG';

    if (!MSG91_AUTH_KEY) {
      console.warn('MSG91_AUTH_KEY is missing. Falling back to simulated mode.');
      // Log OTP server-side only for development debugging (never in response)
      console.log(`[DEV MODE] OTP for ${phone}: ${otp} (MSG91 not configured)`);

      return res.json({
        success: true,
        demoMode: true,
        message: 'OTP sent (development mode - check server logs)',
        warning: 'MSG91 not configured. Configure MSG91_AUTH_KEY for production SMS delivery.'
      });
    }

    try {
      const message = `Your Tarang verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;

      console.log(`Sending OTP to +91${phone} via MSG91...`);

      const response = await axios.get('https://control.msg91.com/api/sendhttp.php', {
        params: {
          authkey: MSG91_AUTH_KEY,
          mobiles: phone,
          message: message,
          sender: MSG91_SENDER_ID,
          route: '4', // Transactional route
          country: '91', // India country code
          flash: '0' // Normal SMS for OTP
        }
      });

      console.log('MSG91 Response:', response.data);

      if (response.data && typeof response.data === 'string' && response.data.length > 0 && !response.data.toLowerCase().includes('error')) {
        res.json({ success: true, message: 'OTP sent successfully' });
      } else {
        throw new Error('MSG91 API error: ' + (response.data || 'Unknown error'));
      }
    } catch (msg91Error) {
      console.error(`MSG91 error for ${phone}:`, msg91Error.message);
      // Log OTP server-side only for development debugging (never in response)
      console.log(`[DEV MODE] OTP for ${phone}: ${otp} (SMS sending failed)`);

      // Still store OTP for verification (development fallback)
      return res.json({
        success: true,
        message: 'OTP generated (SMS sending failed - check server logs in development)',
        warning: 'SMS sending failed, but OTP is stored for verification. Configure MSG91 properly for production.'
      });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number.' });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Invalid OTP. Must be 6 digits.' });
    }

    const otpDoc = await db.collection('otp_requests').doc(phone).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ success: false, error: 'OTP not found. Please request a new OTP.' });
    }

    const storedOtp = otpDoc.data();

    if (Date.now() > storedOtp.expiresAt) {
      await db.collection('otp_requests').doc(phone).delete();
      return res.status(400).json({ success: false, error: 'OTP expired. Please request a new OTP.' });
    }

    if (storedOtp.attempts >= 5) {
      await db.collection('otp_requests').doc(phone).delete();
      return res.status(400).json({ success: false, error: 'Too many attempts. Please request a new OTP.' });
    }

    // Increment attempts
    await db.collection('otp_requests').doc(phone).update({
      attempts: admin.firestore.FieldValue.increment(1)
    });

    if (storedOtp.code !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP. Please try again.' });
    }

    // OTP verified successfully - remove from store
    await db.collection('otp_requests').doc(phone).delete();

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
