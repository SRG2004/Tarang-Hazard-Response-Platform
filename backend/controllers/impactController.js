const admin = require('firebase-admin');
const db = admin.firestore();

exports.getImpactReports = async (req, res) => {
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
};

exports.createImpactReport = async (req, res) => {
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
};
