/**
 * Flash Alert Routes - Send broadcast push notifications via FCM
 * Authorities can send emergency alerts to citizens, volunteers, or officials
 */
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * POST /api/alerts/flash
 * Send a flash alert to multiple recipients via FCM
 * 
 * Body: { message, recipients, priority, areaId? }
 * recipients: 'all' | 'area' | 'volunteers' | 'officials' | 'citizens'
 */
router.post('/flash', async (req, res) => {
    try {
        const { message, recipients = 'all', priority = 'high', areaId, title } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
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
            case 'area':
                // If area is specified, filter by areaId (requires users to have areaId field)
                if (areaId) {
                    usersQuery = usersQuery.where('areaId', '==', areaId);
                }
                break;
            case 'all':
            default:
                // No filter - send to all users with FCM tokens
                break;
        }

        // Get users with FCM tokens
        const usersSnapshot = await usersQuery.get();

        const fcmTokens = [];
        const userIds = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Check for fcmToken (from client registration)
            if (userData.fcmToken) {
                fcmTokens.push(userData.fcmToken);
                userIds.push(doc.id);
            }
            // Also check for notificationToken (legacy field name)
            else if (userData.notificationToken) {
                fcmTokens.push(userData.notificationToken);
                userIds.push(doc.id);
            }
        });

        if (fcmTokens.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No users with push notifications enabled',
                sent: 0,
                failed: 0,
                total: usersSnapshot.size
            });
        }

        // Prepare FCM message
        const notificationPayload = {
            notification: {
                title: title || '🚨 Emergency Alert',
                body: message.trim(),
                icon: '/logo192.png',
            },
            data: {
                type: 'flash_alert',
                priority: priority,
                click_action: '/dashboard',
                timestamp: new Date().toISOString(),
            },
            // Android-specific options for high priority
            android: {
                priority: priority === 'critical' ? 'high' : 'normal',
                notification: {
                    channelId: 'emergency_alerts',
                    priority: priority === 'critical' ? 'max' : 'high',
                    sound: 'default',
                }
            },
            // APNs (iOS) options
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: title || '🚨 Emergency Alert',
                            body: message.trim(),
                        },
                        sound: 'default',
                        badge: 1,
                    }
                }
            }
        };

        // Send to all tokens (FCM supports up to 500 per batch)
        let successCount = 0;
        let failureCount = 0;
        const invalidTokens = [];

        // Process in batches of 500
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
            } catch (batchError) {
                console.error('Batch send error:', batchError);
                failureCount += batchTokens.length;
            }
        }

        // Clean up invalid tokens (async, don't wait)
        if (invalidTokens.length > 0) {
            cleanupInvalidTokens(invalidTokens).catch(console.error);
        }

        // Store alert record for audit
        const alertRecord = {
            message: message.trim(),
            title: title || 'Emergency Alert',
            recipients: recipients,
            priority: priority,
            areaId: areaId || null,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentBy: req.user?.uid || 'system',
            stats: {
                targetUsers: usersSnapshot.size,
                tokensFound: fcmTokens.length,
                successCount,
                failureCount,
                invalidTokens: invalidTokens.length
            }
        };

        await db.collection('flashAlerts').add(alertRecord);

        console.log(`Flash alert sent: ${successCount} success, ${failureCount} failed`);

        res.json({
            success: true,
            message: `Alert sent to ${successCount} devices`,
            sent: successCount,
            failed: failureCount,
            total: fcmTokens.length
        });

    } catch (error) {
        console.error('Flash alert error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/alerts/flash/history
 * Get history of sent flash alerts
 */
router.get('/flash/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const alertsSnapshot = await db.collection('flashAlerts')
            .orderBy('sentAt', 'desc')
            .limit(limit)
            .get();

        const alerts = [];
        alertsSnapshot.forEach(doc => {
            const data = doc.data();
            alerts.push({
                id: doc.id,
                ...data,
                sentAt: data.sentAt?.toDate?.()?.toISOString() || null
            });
        });

        res.json({ success: true, alerts });
    } catch (error) {
        console.error('Error fetching alert history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Helper: Remove invalid tokens from user documents
 */
async function cleanupInvalidTokens(invalidTokens) {
    const batch = db.batch();

    // Find users with these tokens
    const usersSnapshot = await db.collection('users')
        .where('fcmToken', 'in', invalidTokens.slice(0, 10)) // Firestore 'in' limit
        .get();

    usersSnapshot.forEach(doc => {
        batch.update(doc.ref, {
            fcmToken: admin.firestore.FieldValue.delete(),
            fcmTokenInvalidatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    console.log(`Cleaned up ${usersSnapshot.size} invalid FCM tokens`);
}

module.exports = router;
