const express = require('express');
const router = express.Router();
const osintAggregator = require('../services/osintAggregator');
const admin = require('firebase-admin');
const db = admin.firestore();

// Trigger a manual scan (Admin or Official only in prod, open for demo)
router.post('/trigger', async (req, res) => {
    try {
        const stats = await osintAggregator.runAggregationPipeline();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get verified alerts
router.get('/alerts', async (req, res) => {
    try {
        const { platform, hazardType, limit } = req.query;
        let query = db.collection('osintReports').orderBy('processedAt', 'desc');

        if (platform) query = query.where('platform', '==', platform);
        if (hazardType) query = query.where('aiAnalysis.hazardType', '==', hazardType);

        query = query.limit(parseInt(limit) || 50);

        const snapshot = await query.get();
        const alerts = snapshot.docs.map(doc => doc.data());

        res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Analytics for Dashboard
router.get('/analytics', async (req, res) => {
    try {
        // Simple aggregation (in a real app, use aggregated collections or BigQuery)
        const snapshot = await db.collection('osintReports')
            .orderBy('processedAt', 'desc')
            .limit(200) // Analyze last 200 items
            .get();

        const reports = snapshot.docs.map(doc => doc.data());

        // 1. Source Distribution
        const sources = {};
        reports.forEach(r => {
            sources[r.platform] = (sources[r.platform] || 0) + 1;
        });

        // 2. Timeline (Group by Day)
        const timeline = {};
        reports.forEach(r => {
            const date = new Date(r.timestamp).toISOString().split('T')[0];
            timeline[date] = (timeline[date] || 0) + 1;
        });

        // 3. Top Hazards
        const hazards = {};
        reports.forEach(r => {
            const type = r.aiAnalysis?.hazardType || 'unknown';
            hazards[type] = (hazards[type] || 0) + 1;
        });

        res.json({
            success: true,
            analytics: {
                sources,
                timeline,
                hazards,
                totalAnalyzed: reports.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
