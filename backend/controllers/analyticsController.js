const admin = require('firebase-admin');
const db = admin.firestore();

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin or Authority access required' });
    }

    const [
      usersSnapshot,
      reportsSnapshot,
      donationsSnapshot,
      volunteersSnapshot,
      socialMediaReportsSnapshot,
      trainingJobsSnapshot,
      predictionsSnapshot
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('reports').get(),
      db.collection('donations').where('status', '==', 'completed').get(),
      db.collection('volunteers').get(),
      db.collection('socialMediaReports').get(),
      db.collection('trainingJobs').orderBy('createdAt', 'desc').limit(1).get(),
      db.collection('predictions').orderBy('createdAt', 'desc').limit(10).get()
    ]);

    const reports = reportsSnapshot.docs.map(doc => doc.data());
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
    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

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
};
