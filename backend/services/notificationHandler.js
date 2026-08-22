const admin = require('firebase-admin');
const emailService = require('./emailService');

class NotificationHandler {
  constructor() {
    this.db = admin.firestore();
  }

  // Get user notification settings
  async getUserSettings(userId) {
    try {
      const settingsDoc = await this.db.collection('notificationSettings').doc(userId).get();

      if (settingsDoc.exists) {
        return settingsDoc.data();
      }

      // Default settings
      return {
        pushEnabled: false,
        emailEnabled: true,
        newReports: true,
        reportVerified: true,
        hotspots: true,
        criticalAlerts: true,
        dailyDigest: false,
        weeklyReport: false,
      };
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  // Get user info including email and FCM token
  async getUserInfo(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  // Get all officials and analysts
  async getOfficials() {
    try {
      const usersSnapshot = await this.db.collection('users')
        .where('role', '==', 'authority')
        .get();

      const officials = [];
      usersSnapshot.forEach(doc => {
        officials.push({ id: doc.id, ...doc.data() });
      });

      return officials;
    } catch (error) {
      console.error('Error getting officials:', error);
      return [];
    }
  }

  // Send push notification via FCM
  async sendPushNotification(tokens, notification, data = {}) {
    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens to send to');
      return { success: false, message: 'No tokens' };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/logo192.png',
        },
        data: {
          ...data,
          click_action: data.url || '/dashboard',
        },
        tokens: Array.isArray(tokens) ? tokens : [tokens],
      };

      const response = await admin.messaging().sendMulticast(message);

      console.log(`Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.log('Failed tokens:', failedTokens);
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify about new report
  async notifyNewReport(report, reportUserId) {
    try {
      const officials = await this.getOfficials();

      const pushTokens = [];
      const emailRecipients = [];

      // Check each official's notification settings
      for (const official of officials) {
        const settings = await this.getUserSettings(official.id);

        if (settings && settings.newReports) {
          // Add push token if enabled
          if (settings.pushEnabled && official.notificationToken) {
            pushTokens.push(official.notificationToken);
          }

          // Add email if enabled
          if (settings.emailEnabled && official.email) {
            emailRecipients.push(official.email);
          }
        }
      }

      // Send push notifications
      if (pushTokens.length > 0) {
        await this.sendPushNotification(
          pushTokens,
          {
            title: '🌊 New Hazard Report',
            body: `${report.type}: ${report.description.substring(0, 100)}`,
            icon: '/logo192.png',
          },
          {
            type: 'new_report',
            reportId: report.id,
            url: '/dashboard',
          }
        );
      }

      // Send email notifications
      if (emailRecipients.length > 0) {
        await emailService.sendNewReportNotification(report, emailRecipients);
      }

      console.log(`New report notifications sent: ${pushTokens.length} push, ${emailRecipients.length} email`);

      return { success: true, push: pushTokens.length, email: emailRecipients.length };
    } catch (error) {
      console.error('Error notifying new report:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify about report verification
  async notifyReportVerified(report, reportUserId) {
    try {
      const userInfo = await getUserInfo(reportUserId);
      const settings = await this.getUserSettings(reportUserId);

      if (!userInfo || !settings || !settings.reportVerified) {
        console.log('User settings disabled or not found');
        return { success: false, message: 'Settings disabled' };
      }

      // Send push notification
      if (settings.pushEnabled && userInfo.notificationToken) {
        await this.sendPushNotification(
          [userInfo.notificationToken],
          {
            title: '✅ Report Verified',
            body: `Your ${report.type} report has been verified by officials`,
            icon: '/logo192.png',
          },
          {
            type: 'report_verified',
            reportId: report.id,
            url: '/dashboard',
          }
        );
      }

      // Send email notification
      if (settings.emailEnabled && userInfo.email) {
        await emailService.sendVerificationNotification(report, userInfo.email);
      }

      return { success: true };
    } catch (error) {
      console.error('Error notifying report verified:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify about critical alert
  async notifyCriticalAlert(alert) {
    try {
      const officials = await this.getOfficials();

      const pushTokens = [];
      const emailRecipients = [];

      // Critical alerts go to all officials regardless of settings
      for (const official of officials) {
        if (official.notificationToken) {
          pushTokens.push(official.notificationToken);
        }
        if (official.email) {
          emailRecipients.push(official.email);
        }
      }

      // Send push notifications
      if (pushTokens.length > 0) {
        await this.sendPushNotification(
          pushTokens,
          {
            title: '🚨 CRITICAL ALERT',
            body: alert.message,
            icon: '/logo192.png',
          },
          {
            type: 'critical_alert',
            alertId: alert.id,
            priority: 'high',
            url: '/dashboard',
          }
        );
      }

      // Send email notifications
      if (emailRecipients.length > 0) {
        await emailService.sendCriticalAlert(alert, emailRecipients);
      }

      console.log(`Critical alert notifications sent: ${pushTokens.length} push, ${emailRecipients.length} email`);

      return { success: true, push: pushTokens.length, email: emailRecipients.length };
    } catch (error) {
      console.error('Error notifying critical alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify about hotspot detection
  async notifyHotspotDetected(hotspot) {
    try {
      const officials = await this.getOfficials();

      const pushTokens = [];
      const emailRecipients = [];

      // Check each official's notification settings
      for (const official of officials) {
        const settings = await this.getUserSettings(official.id);

        if (settings && settings.hotspots) {
          if (settings.pushEnabled && official.notificationToken) {
            pushTokens.push(official.notificationToken);
          }

          if (settings.emailEnabled && official.email) {
            emailRecipients.push(official.email);
          }
        }
      }

      // Send push notifications
      if (pushTokens.length > 0) {
        await this.sendPushNotification(
          pushTokens,
          {
            title: '📍 Hotspot Detected',
            body: `Multiple reports (${hotspot.count}) detected in ${hotspot.location}`,
            icon: '/logo192.png',
          },
          {
            type: 'hotspot_detected',
            hotspotId: hotspot.id,
            url: '/dashboard',
          }
        );
      }

      // Send email notifications
      if (emailRecipients.length > 0) {
        await emailService.sendHotspotNotification(hotspot, emailRecipients);
      }

      console.log(`Hotspot notifications sent: ${pushTokens.length} push, ${emailRecipients.length} email`);

      return { success: true, push: pushTokens.length, email: emailRecipients.length };
    } catch (error) {
      console.error('Error notifying hotspot:', error);
      return { success: false, error: error.message };
    }
  }

  // Send daily digest to users who have it enabled
  async sendDailyDigests() {
    try {
      // Get reports from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reportsSnapshot = await this.db.collection('reports')
        .where('createdAt', '>=', today.toISOString())
        .get();

      const reports = [];
      reportsSnapshot.forEach(doc => {
        reports.push({ id: doc.id, ...doc.data() });
      });

      // Calculate summary
      const summary = {
        totalReports: reports.length,
        verified: reports.filter(r => r.verified).length,
        critical: reports.filter(r => r.priority === 'high' || r.critical).length,
        hotspots: 0, // Would need to calculate
        topHazards: this.getTopHazards(reports),
      };

      // Get users with daily digest enabled
      const settingsSnapshot = await this.db.collection('notificationSettings')
        .where('dailyDigest', '==', true)
        .where('emailEnabled', '==', true)
        .get();

      let sentCount = 0;
      for (const settingDoc of settingsSnapshot.docs) {
        const userId = settingDoc.id;
        const userInfo = await this.getUserInfo(userId);

        if (userInfo && userInfo.email) {
          await emailService.sendDailyDigest(summary, userInfo.email);
          sentCount++;
        }
      }

      console.log(`Daily digests sent to ${sentCount} users`);
      return { success: true, count: sentCount };
    } catch (error) {
      console.error('Error sending daily digests:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper: Get top hazard types
  getTopHazards(reports) {
    const hazardCounts = {};
    reports.forEach(report => {
      hazardCounts[report.type] = (hazardCounts[report.type] || 0) + 1;
    });

    return Object.entries(hazardCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}

// Export singleton instance
const notificationHandler = new NotificationHandler();
module.exports = notificationHandler;
