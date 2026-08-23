const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Note: Ensure `verifyAuth` middleware is passed where this router is mounted

router.get('/', async (req, res) => {
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

router.post('/verify/:id', async (req, res) => {
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

router.post('/reject/:id', async (req, res) => {
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

router.post('/solve/:id', async (req, res) => {
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

router.post('/reanalyze', async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId) {
      return res.status(400).json({ success: false, error: 'Missing reportId' });
    }

    const reportRef = db.collection('reports').doc(reportId);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const report = doc.data();
    
    // Lazy load the service to prevent circular dependencies
    const reportAnalysisService = require('../services/reportAnalysisService');
    await reportAnalysisService.performReportAnalysis(report, reportId);

    const updatedDoc = await reportRef.get();
    res.json({ success: true, report: updatedDoc.data() });
  } catch (error) {
    console.error('Error re-analyzing report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
