const admin = require('firebase-admin');
const axios = require('axios');

const db = admin.firestore();

// Send Flash SMS to all users with phone numbers
exports.sendFlashSMS = async (req, res) => {
    try {
        const { message } = req.body;
        let { userRole, userId } = req.body;

        // Use authenticated user if available
        if (req.user && req.user.uid) {
            userId = req.user.uid;
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role;
            }
        }

        // Validate request
        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        if (!userRole || (userRole !== 'admin' && userRole !== 'official')) {
            return res.status(403).json({ success: false, error: 'Unauthorized. Only admins and officials can send alerts.' });
        }

        // Get all users with phone numbers
        // Note: In a real production app with millions of users, this should be batched or handled via a queue.
        // For this project scale, fetching all users with phones is acceptable.
        const usersSnapshot = await db.collection('users').where('phone', '!=', null).get();

        if (usersSnapshot.empty) {
            return res.json({
                success: true,
                sentCount: 0,
                failedCount: 0,
                message: 'No users with phone numbers found.'
            });
        }

        const phoneNumbers = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.phone) {
                // Remove all non-numeric characters
                const cleanPhone = String(userData.phone).replace(/\D/g, '');

                // Check for valid Indian numbers
                if (cleanPhone.length === 10) {
                    phoneNumbers.push(cleanPhone);
                } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
                    // Extract last 10 digits
                    phoneNumbers.push(cleanPhone.substring(2));
                } else if (cleanPhone.length > 10) {
                    // Try to extract last 10 digits as a fallback for other formats
                    // This is a heuristic; might need refinement for international support
                    const last10 = cleanPhone.substring(cleanPhone.length - 10);
                    if (last10.length === 10) {
                        phoneNumbers.push(last10);
                    }
                }
            }
        });

        if (phoneNumbers.length === 0) {
            return res.json({
                success: true,
                sentCount: 0,
                failedCount: 0,
                message: 'No valid phone numbers found.'
            });
        }

        // MSG91 Configuration
        let functionsConfigHelper = null;
        try {
            const functions = require('firebase-functions');
            functionsConfigHelper = functions.config;
        } catch (e) {
            // Ignore
        }

        const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.auth_key);
        const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.sender_id) || 'TARANG';

        // 2Factor Configuration
        const TWOFACTOR_API_KEY = process.env.TWOFACTOR_API_KEY || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().twofactor?.api_key);
        const TWOFACTOR_SENDER_ID = process.env.TWOFACTOR_SENDER_ID || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().twofactor?.sender_id) || 'TARANG';

        let smsStatus = 'failed';
        let providerResponse = null;
        let providerName = 'none';

        // 1. Try MSG91 first
        if (MSG91_AUTH_KEY) {
            try {
                const mobiles = phoneNumbers.join(',');
                console.log(`Sending Flash SMS to ${phoneNumbers.length} recipients via MSG91...`);

                const response = await axios.get('https://control.msg91.com/api/sendhttp.php', {
                    params: {
                        authkey: MSG91_AUTH_KEY,
                        mobiles: mobiles,
                        message: message,
                        sender: MSG91_SENDER_ID,
                        route: '4', // Transactional
                        country: '91',
                        flash: '1' // Flash SMS
                    }
                });

                console.log('MSG91 Response:', response.data);
                smsStatus = 'sent';
                providerResponse = response.data;
                providerName = 'msg91';
            } catch (error) {
                console.error('MSG91 failed:', error.message);
                // Fallback to 2Factor
            }
        }

        // 2. Fallback to 2Factor if MSG91 failed or not configured
        if (smsStatus !== 'sent' && TWOFACTOR_API_KEY) {
            try {
                const mobiles = phoneNumbers.join(',');
                console.log(`Sending Flash SMS to ${phoneNumbers.length} recipients via 2Factor...`);

                // 2Factor Transactional API
                const response = await axios.get('https://2factor.in/API/R1/', {
                    params: {
                        module: 'TRANS_SMS',
                        apikey: TWOFACTOR_API_KEY,
                        to: mobiles,
                        from: TWOFACTOR_SENDER_ID,
                        msg: message
                    }
                });

                console.log('2Factor Response:', response.data);
                smsStatus = 'sent';
                providerResponse = response.data;
                providerName = '2factor';
            } catch (error) {
                console.error('2Factor failed:', error.message);
            }
        }

        // 3. Send Push Notification (Always try)
        let pushStatus = 'skipped';
        let pushCount = 0;
        try {
            // Get all users with FCM tokens
            const tokenSnapshot = await db.collection('users').where('fcmToken', '!=', null).get();
            const tokens = [];
            tokenSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.fcmToken) tokens.push(data.fcmToken);
            });

            if (tokens.length > 0) {
                console.log(`Sending Push Notification to ${tokens.length} devices...`);

                // Batch send (max 500 per batch)
                const batchSize = 500;
                for (let i = 0; i < tokens.length; i += batchSize) {
                    const batchTokens = tokens.slice(i, i + batchSize);
                    const messagePayload = {
                        notification: {
                            title: '📢 Emergency Alert',
                            body: message,
                        },
                        data: {
                            type: 'flash_alert',
                            message: message,
                            timestamp: new Date().toISOString()
                        },
                        tokens: batchTokens
                    };

                    const response = await admin.messaging().sendEachForMulticast(messagePayload);
                    console.log(`Push batch ${i / batchSize + 1} response:`, response.successCount + ' success');
                    pushCount += response.successCount;
                }
                pushStatus = 'sent';
            }
        } catch (error) {
            console.error('Push notification failed:', error);
            pushStatus = 'failed';
        }

        // If no SMS provider configured and not sent
        if (smsStatus !== 'sent' && !MSG91_AUTH_KEY && !TWOFACTOR_API_KEY) {
            console.warn('No SMS provider configured. Falling back to simulated mode.');
            // ... (existing demo mode logic) ...
            // I'll keep the existing demo mode logic but updated

            // Store in history
            await db.collection('alert_history').add({
                message,
                sentBy: userId,
                sentByRole: userRole,
                recipientCount: phoneNumbers.length,
                status: 'simulated',
                pushStatus,
                pushCount,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.json({
                success: true,
                demoMode: true,
                sentCount: phoneNumbers.length,
                pushCount,
                message: 'Demo mode: SMS simulated. Push notifications sent if configured.'
            });
        }

        // Store history
        await db.collection('alert_history').add({
            message,
            sentBy: userId,
            sentByRole: userRole,
            recipientCount: phoneNumbers.length,
            status: smsStatus,
            provider: providerName,
            providerResponse: providerResponse,
            pushStatus,
            pushCount,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({
            success: true,
            sentCount: phoneNumbers.length,
            pushCount,
            provider: providerName,
            message: `Alert sent via ${providerName === 'none' ? 'simulation' : providerName} and Push (${pushCount})`
        });

    } catch (error) {
        console.error('Error sending flash SMS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get Alert History
exports.getAlertHistory = async (req, res) => {
    try {
        // Use authenticated user if available (from verifyAuth middleware)
        let userRole = req.query.userRole;

        if (req.user && req.user.uid) {
            const userDoc = await db.collection('users').doc(req.user.uid).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role;
            }
        }

        if (!userRole || (userRole !== 'admin' && userRole !== 'official')) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const snapshot = await db.collection('alert_history')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const history = [];
        snapshot.forEach(doc => {
            history.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            });
        });

        res.json({ success: true, history });
    } catch (error) {
        console.error('Error fetching alert history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get SMS Status
exports.getSMSStatus = async (req, res) => {
    try {
        let functionsConfigHelper = null;
        try {
            const functions = require('firebase-functions');
            functionsConfigHelper = functions.config;
        } catch (e) { }

        const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.auth_key);
        const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || (functionsConfigHelper && typeof functionsConfigHelper === 'function' && functionsConfigHelper().msg91?.sender_id) || 'TARANG';

        if (MSG91_AUTH_KEY) {
            res.json({
                mode: 'msg91',
                msg91: {
                    configured: true,
                    senderId: MSG91_SENDER_ID
                }
            });
        } else {
            res.json({
                mode: 'demo',
                statusMessage: 'Demo mode active. Configure MSG91 for real SMS.'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
