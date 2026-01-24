const nodemailer = require('nodemailer');
const functions = require('firebase-functions');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  // Initialize email transporter
  initialize() {
    if (this.initialized) return;

    // Use environment variables for email configuration
    const emailConfig = {
      host: functions.config().app.email_host || 'smtp.gmail.com',
      port: parseInt(functions.config().app.email_port) || 587,
      secure: functions.config().app.email_secure === 'true', // true for 465, false for other ports
      auth: {
        user: functions.config().app.email_user,
        pass: functions.config().app.email_password,
      },
    };

    // Only initialize if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.initialized = true;
      console.log('Email service initialized');
    } else {
      console.warn('Email service not configured - EMAIL_USER and EMAIL_PASSWORD not set');
    }
  }

  // Check if email service is ready
  isConfigured() {
    return this.initialized && this.transporter !== null;
  }

  // Send email
  async sendEmail(to, subject, html, text = null) {
    if (!this.isConfigured()) {
      console.warn('Email service not configured, skipping email');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"Tarang - INCOIS" <${functions.config().app.email_user}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification for new report
  async sendNewReportNotification(report, recipients) {
    const subject = `🌊 New Hazard Report: ${report.type}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
          New Hazard Report
        </h2>
        
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #2d3748;">${report.type}</h3>
          <p style="color: #4a5568; margin: 5px 0;"><strong>Location:</strong> ${report.location || 'Unknown'}</p>
          <p style="color: #4a5568; margin: 5px 0;"><strong>Description:</strong> ${report.description}</p>
          <p style="color: #4a5568; margin: 5px 0;"><strong>Reported at:</strong> ${new Date(report.createdAt).toLocaleString()}</p>
          ${report.latitude && report.longitude ? 
            `<p style="color: #4a5568; margin: 5px 0;"><strong>Coordinates:</strong> ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}</p>` 
            : ''}
        </div>

        ${report.photoURL ? 
          `<div style="margin: 20px 0;">
            <img src="${report.photoURL}" alt="Report photo" style="max-width: 100%; border-radius: 8px;" />
          </div>` 
          : ''}

        <div style="margin: 20px 0;">
          <a href="${functions.config().app.frontend_url || 'http://localhost:3000'}/dashboard" 
             style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View on Dashboard
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated notification from Tarang - Ocean Hazard Reporting Platform<br>
          INCOIS - Indian National Centre for Ocean Information Services
        </p>
      </div>
    `;

    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, html);
      results.push({ recipient, ...result });
    }
    return results;
  }

  // Send report verification notification
  async sendVerificationNotification(report, userEmail) {
    const subject = `✅ Your Report Has Been Verified`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
          Report Verified
        </h2>
        
        <p style="color: #4a5568; font-size: 16px;">
          Your hazard report has been verified by INCOIS officials.
        </p>

        <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 10px 0; color: #065f46;">${report.type}</h3>
          <p style="color: #047857; margin: 5px 0;">${report.description}</p>
          <p style="color: #047857; margin: 5px 0;"><strong>Location:</strong> ${report.location || 'Unknown'}</p>
          <p style="color: #047857; margin: 5px 0;"><strong>Verified at:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p style="color: #4a5568;">
          Thank you for your contribution to ocean hazard monitoring and coastal safety.
        </p>

        <div style="margin: 20px 0;">
          <a href="${functions.config().app.frontend_url || 'http://localhost:3000'}/dashboard" 
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View on Dashboard
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Tarang - Ocean Hazard Reporting Platform<br>
          INCOIS - Indian National Centre for Ocean Information Services
        </p>
      </div>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  // Send critical alert notification
  async sendCriticalAlert(alert, recipients) {
    const subject = `🚨 CRITICAL ALERT: ${alert.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px;">
          <h2 style="color: #991b1b; margin: 0 0 15px 0;">
            🚨 CRITICAL ALERT
          </h2>
          
          <h3 style="color: #7f1d1d; margin: 0 0 10px 0;">${alert.title}</h3>
          <p style="color: #7f1d1d; font-size: 16px; margin: 10px 0;">
            ${alert.message}
          </p>

          ${alert.location ? 
            `<p style="color: #7f1d1d; margin: 5px 0;"><strong>Location:</strong> ${alert.location}</p>` 
            : ''}
          ${alert.severity ? 
            `<p style="color: #7f1d1d; margin: 5px 0;"><strong>Severity:</strong> ${alert.severity}</p>` 
            : ''}
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0; font-weight: bold;">
            ⚠️ Immediate action may be required. Please check the dashboard for details.
          </p>
        </div>

        <div style="margin: 20px 0;">
                    <a href="${functions.config().app.frontend_url || 'http://localhost:3000'}/dashboard" 
           
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Alert Details
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is a critical automated alert from Tarang<br>
          INCOIS - Indian National Centre for Ocean Information Services
        </p>
      </div>
    `;

    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, html);
      results.push({ recipient, ...result });
    }
    return results;
  }

  // Send daily digest
  async sendDailyDigest(reportsSummary, recipient) {
    const subject = `📊 Daily Hazard Report Digest - ${new Date().toLocaleDateString()}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
          Daily Hazard Report Digest
        </h2>
        
        <p style="color: #4a5568; font-size: 16px;">
          Summary of ocean hazard reports for ${new Date().toLocaleDateString()}
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #0369a1;">${reportsSummary.totalReports}</div>
            <div style="color: #075985; margin-top: 5px;">Total Reports</div>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #d97706;">${reportsSummary.verified}</div>
            <div style="color: #92400e; margin-top: 5px;">Verified</div>
          </div>
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${reportsSummary.critical}</div>
            <div style="color: #991b1b; margin-top: 5px;">Critical</div>
          </div>
          <div style="background: #ddd6fe; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #7c3aed;">${reportsSummary.hotspots}</div>
            <div style="color: #5b21b6; margin-top: 5px;">Hotspots</div>
          </div>
        </div>

        ${reportsSummary.topHazards && reportsSummary.topHazards.length > 0 ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #2d3748;">Top Hazard Types</h3>
            <ul style="list-style: none; padding: 0;">
              ${reportsSummary.topHazards.map(hazard => `
                <li style="padding: 8px; background: #f7fafc; margin: 5px 0; border-radius: 4px;">
                  <strong>${hazard.type}:</strong> ${hazard.count} reports
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="margin: 20px 0;">
          <a href="${functions.config().app.frontend_url || 'http://localhost:3000'}/analytics" 
             style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Full Analytics
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Daily digest from Tarang - Ocean Hazard Reporting Platform<br>
          INCOIS - Indian National Centre for Ocean Information Services
        </p>
      </div>
    `;

    return await this.sendEmail(recipient, subject, html);
  }

  // Send hotspot detection notification
  async sendHotspotNotification(hotspot, recipients) {
    const subject = `📍 Hotspot Detected: Multiple Reports in ${hotspot.location}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
          Hotspot Detected
        </h2>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 16px; margin: 0;">
            Multiple hazard reports (${hotspot.count}) have been detected in the same area.
          </p>
        </div>

        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #4a5568; margin: 5px 0;"><strong>Location:</strong> ${hotspot.location}</p>
          <p style="color: #4a5568; margin: 5px 0;"><strong>Report Count:</strong> ${hotspot.count}</p>
          <p style="color: #4a5568; margin: 5px 0;"><strong>Area Radius:</strong> ${hotspot.radius || 5} km</p>
        </div>

        <p style="color: #4a5568;">
          This concentration of reports may indicate a significant hazard event requiring attention.
        </p>

        <div style="margin: 20px 0;">
          <a href="${functions.config().app.frontend_url || 'http://localhost:3000'}/dashboard" 
             style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Hotspot on Map
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Tarang - Ocean Hazard Reporting Platform<br>
          INCOIS - Indian National Centre for Ocean Information Services
        </p>
      </div>
    `;

    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, html);
      results.push({ recipient, ...result });
    }
    return results;
  }

  // Send hazard prediction alert to analysts
  async sendHazardPredictionAlert(alert, recipients) {
    const { predictions, type, message } = alert;
    const isCritical = type === 'critical';
    const subject = isCritical 
      ? `🚨 CRITICAL: ${predictions.length} Hazard Prediction${predictions.length > 1 ? 's' : ''}`
      : `⚠️ ${predictions.length} Hazard Prediction${predictions.length > 1 ? 's' : ''}`;
    
    const predictionsHtml = predictions.map(pred => `
      <div style="background: ${isCritical ? '#fee2e2' : '#fef3c7'}; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${isCritical ? '#dc2626' : '#f59e0b'};">
        <h3 style="color: ${isCritical ? '#991b1b' : '#92400e'}; margin-top: 0;">
          ${pred.location} - ${pred.hazardType}
        </h3>
        <p style="color: #4a5568; margin: 5px 0;"><strong>Severity:</strong> <span style="color: ${isCritical ? '#dc2626' : '#f59e0b'}; font-weight: bold;">${pred.severity.toUpperCase()}</span></p>
        <p style="color: #4a5568; margin: 5px 0;"><strong>Wave Height:</strong> ${pred.conditions.waveHeight?.toFixed(2) || 'N/A'} m</p>
        <p style="color: #4a5568; margin: 5px 0;"><strong>Wind Speed:</strong> ${pred.conditions.windSpeed?.toFixed(1) || 'N/A'} m/s</p>
        <p style="color: #4a5568; margin: 5px 0;"><strong>Weather:</strong> ${pred.conditions.weather || 'N/A'}</p>
        <p style="color: #4a5568; margin: 5px 0;"><strong>Confidence:</strong> ${(pred.confidence * 100).toFixed(0)}%</p>
        ${pred.hazards && pred.hazards.length > 0 ? `
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${pred.hazards.map(h => `<li style="color: #4a5568;">${h.message}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isCritical ? '#dc2626' : '#f59e0b'}; border-bottom: 2px solid ${isCritical ? '#dc2626' : '#f59e0b'}; padding-bottom: 10px;">
          ${isCritical ? '🚨 CRITICAL' : '⚠️'} Hazard Prediction Alert
        </h2>
        
        <div style="background: ${isCritical ? '#fee2e2' : '#fef3c7'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isCritical ? '#dc2626' : '#f59e0b'};">
          <p style="color: ${isCritical ? '#991b1b' : '#92400e'}; font-size: 16px; margin: 0; font-weight: bold;">
            ${message}
          </p>
          <p style="color: #4a5568; margin: 10px 0 0 0;">
            The system has automatically predicted ${predictions.length} potential hazard${predictions.length > 1 ? 's' : ''} based on current weather and ocean conditions.
          </p>
        </div>

        <h3 style="color: #2d3748; margin-top: 30px;">Predicted Hazards:</h3>
        ${predictionsHtml}

        <div style="margin: 20px 0;">
          <a href="${functions.config().app.frontend_url || 'https://tarang-incois.web.app'}/ml-models" 
             style="display: inline-block; background: ${isCritical ? '#dc2626' : '#f59e0b'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Predictions in Dashboard
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated prediction based on weather and ocean conditions.<br>
          Please review and verify these predictions in the ML Model Management dashboard.<br><br>
          Tarang - Ocean Hazard Reporting Platform<br>
          INCOIS - Indian National Centre for Ocean Information Services
        </p>
      </div>
    `;

    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, html);
      results.push({ recipient, ...result });
    }
    return results;
  }

  // Send early warning alert to authorities
  async sendEarlyWarningAlert(alert, recipients) {
    const { warnings, summary, message } = alert;
    const subject = `🚨 EARLY WARNING: ${warnings.length} Ocean Hazard Pattern${warnings.length > 1 ? 's' : ''} Detected`;
    
    const warningsHtml = warnings.map(warning => {
      const timeToHazard = warning.estimatedTimeToHazard 
        ? `${warning.estimatedTimeToHazard} hours`
        : 'Unknown';
      const confidence = (warning.confidence * 100).toFixed(0);
      
      return `
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
          <h3 style="color: #991b1b; margin-top: 0;">
            🚨 ${warning.location} - ${warning.hazardType || warning.predictedHazard || 'Unknown Hazard'}
          </h3>
          <div style="color: #4a5568; margin: 5px 0;">
            <p><strong>Predicted Hazard:</strong> <span style="color: #dc2626; font-weight: bold;">${warning.hazardType || warning.predictedHazard || 'Unknown'}</span></p>
            <p><strong>Severity:</strong> <span style="color: #dc2626; font-weight: bold;">${warning.severity.toUpperCase()}</span></p>
            <p><strong>Confidence:</strong> ${confidence}%</p>
            <p><strong>Estimated Time to Hazard:</strong> ${timeToHazard}</p>
            <p><strong>Location:</strong> ${warning.location} (${warning.latitude?.toFixed(4) || 'N/A'}, ${warning.longitude?.toFixed(4) || 'N/A'})</p>
            ${warning.patternDetails ? `
              <div style="margin-top: 10px; padding: 10px; background: #fef2f2; border-radius: 4px;">
                <p style="color: #7f1d1d; margin: 0; font-size: 14px;"><strong>Pattern Indicators:</strong></p>
                <ul style="color: #7f1d1d; margin: 5px 0 0 0; padding-left: 20px; font-size: 14px;">
                  ${warning.patternDetails.indicators?.map(ind => `<li>${ind.replace(/_/g, ' ')}</li>`).join('') || ''}
                </ul>
                ${warning.patternDetails.reason ? `
                  <p style="color: #7f1d1d; margin: 10px 0 0 0; font-size: 14px;"><strong>Reason:</strong> ${warning.patternDetails.reason}</p>
                ` : ''}
              </div>
            ` : ''}
            ${warning.conditions ? `
              <div style="margin-top: 10px;">
                <p style="color: #4a5568; margin: 5px 0; font-size: 14px;"><strong>Current Conditions:</strong></p>
                <p style="color: #4a5568; margin: 2px 0; font-size: 14px;">Wave Height: ${warning.conditions.waveHeight?.toFixed(2) || 'N/A'} m</p>
                <p style="color: #4a5568; margin: 2px 0; font-size: 14px;">Wind Speed: ${warning.conditions.windSpeed?.toFixed(1) || 'N/A'} m/s</p>
                <p style="color: #4a5568; margin: 2px 0; font-size: 14px;">Weather: ${warning.conditions.weather || 'N/A'}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #991b1b; margin: 0 0 15px 0;">
            🚨 EARLY WARNING: Ocean Hazard Patterns Detected
          </h2>
          
          <p style="color: #7f1d1d; font-size: 16px; margin: 10px 0; font-weight: bold;">
            ${summary}
          </p>
          
          <p style="color: #7f1d1d; font-size: 14px; margin: 10px 0;">
            ${message}
          </p>
          
          <div style="background: #fef2f2; padding: 12px; border-radius: 6px; margin-top: 15px;">
            <p style="color: #991b1b; margin: 0; font-size: 14px; font-weight: bold;">
              ⚠️ This is an EARLY WARNING based on pattern analysis. Hazards are predicted BEFORE they fully develop, allowing for proactive response.
            </p>
          </div>
        </div>

        <h3 style="color: #2d3748; margin-top: 30px; margin-bottom: 15px;">Early Warning Predictions:</h3>
        ${warningsHtml}

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0; font-weight: bold;">
            📋 Action Required: Review these predictions and prepare response measures if necessary.
          </p>
        </div>

        <div style="margin: 20px 0;">
          <a href="${functions.config().app.frontend_url || 'https://tarang-incois.web.app'}/ml-models" 
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Predictions in Dashboard
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <strong>Pattern Analysis:</strong> These predictions are based on time-series pattern analysis of historical ocean conditions. 
          The system identifies patterns that typically precede hazards, enabling early warning.<br><br>
          Tarang - Ocean Hazard Reporting Platform<br>
          INCOIS - Indian National Centre for Ocean Information Services
        </p>
      </div>
    `;

    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, html);
      results.push({ recipient, ...result });
    }
    return results;
  }
}

// Export singleton instance
const emailService = new EmailService();
emailService.initialize();

module.exports = emailService;
