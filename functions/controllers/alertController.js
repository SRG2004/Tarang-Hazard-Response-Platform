const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Send Flash Alert via Firebase Cloud Messaging (FCM)
 * FCM-only implementation - no SMS fallback
 */
exports.sendFlashSMS = async (req, res) => {
    try {
        const { message, recipients = 'all', priority = 'high' } = req.body;
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

        if (!userRole || !['admin', 'authority', 'official'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized. Only admins and authorities can send alerts.'
            });
        }

        // Build query based on recipients
        let usersQuery = db.collection('users');

        switch (recipients) {
            case 'officials':
                usersQuery = usersQuery.where('role', 'in', ['authority', 'admin']);
                break;
            case 'volunteers':
                usersQuery = usersQuery.where('role', '==', 'responder');
                break;
            case 'citizens':
                usersQuery = usersQuery.where('role', '==', 'citizen');
                break;
            case 'all':
            default:
                // No filter - get all users
                break;
        }

        const usersSnapshot = await usersQuery.get();

        // Collect FCM tokens
        const fcmTokens = [];
        const userIds = [];
        let totalUsers = 0;

        usersSnapshot.forEach(doc => {
            totalUsers++;
            const userData = doc.data();
            // Support both field names
            const token = userData.fcmToken || userData.notificationToken;
            if (token) {
                fcmTokens.push(token);
                userIds.push(doc.id);
            }
        });

        if (fcmTokens.length === 0) {
            // Store history even if no tokens
            await db.collection('alert_history').add({
                message,
                sentBy: userId,
                sentByRole: userRole,
                recipients,
                recipientCount: 0,
                totalUsers,
                pushCount: 0,
                status: 'no_tokens',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.json({
                success: true,
                message: 'No users with push notifications enabled',
                sentCount: 0,
                pushCount: 0,
                totalUsers
            });
        }

        // Send FCM notifications in batches of 500
        console.log(`Sending FCM alert to ${fcmTokens.length} devices...`);

        let successCount = 0;
        let failureCount = 0;
        const invalidTokens = [];

        const notificationPayload = {
            notification: {
                title: '🚨 Emergency Alert',
                body: message,
            },
            data: {
                type: 'flash_alert',
                priority: priority,
                message: message,
                timestamp: new Date().toISOString()
            },
            android: {
                priority: priority === 'critical' ? 'high' : 'normal',
                notification: {
                    channelId: 'emergency_alerts',
                    sound: 'default',
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    }
                }
            }
        };

        // Process in batches of 500 (FCM limit)
        for (let i = 0; i < fcmTokens.length; i += 500) {
            const batchTokens = fcmTokens.slice(i, i + 500);

            try {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: batchTokens,
                    ...notificationPayload
                });

                successCount += response.successCount;
                failureCount += response.failureCount;

                // Track invalid tokens for cleanup
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(batchTokens[idx]);
                        }
                    }
                });

                console.log(`FCM batch ${Math.floor(i / 500) + 1}: ${response.successCount} success, ${response.failureCount} failed`);
            } catch (batchError) {
                console.error('FCM batch error:', batchError);
                failureCount += batchTokens.length;
            }
        }

        // Clean up invalid tokens asynchronously
        if (invalidTokens.length > 0) {
            cleanupInvalidTokens(invalidTokens).catch(console.error);
        }

        // Store alert history
        await db.collection('alert_history').add({
            message,
            sentBy: userId,
            sentByRole: userRole,
            recipients,
            recipientCount: fcmTokens.length,
            totalUsers,
            pushCount: successCount,
            failureCount,
            status: 'sent',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Flash alert complete: ${successCount} success, ${failureCount} failed`);

        return res.json({
            success: true,
            message: `Alert sent to ${successCount} devices`,
            sentCount: fcmTokens.length,
            pushCount: successCount,
            failureCount,
            totalUsers
        });

    } catch (error) {
        console.error('Error sending flash alert:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Helper: Remove invalid FCM tokens from user documents
 */
async function cleanupInvalidTokens(invalidTokens) {
    try {
        // Process in batches of 10 (Firestore 'in' query limit)
        for (let i = 0; i < invalidTokens.length; i += 10) {
            const batch = invalidTokens.slice(i, i + 10);
            const snapshot = await db.collection('users')
                .where('fcmToken', 'in', batch)
                .get();

            const writeBatch = db.batch();
            snapshot.forEach(doc => {
                writeBatch.update(doc.ref, {
                    fcmToken: admin.firestore.FieldValue.delete()
                });
            });
            await writeBatch.commit();
        }
        console.log(`Cleaned up ${invalidTokens.length} invalid FCM tokens`);
    } catch (error) {
        console.error('Error cleaning up tokens:', error);
    }
}

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

        if (!userRole || !['admin', 'authority', 'official'].includes(userRole)) {
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
