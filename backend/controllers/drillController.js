const admin = require('firebase-admin');
const db = admin.firestore();

exports.getDrills = async (req, res) => {
  try {
    const snapshot = await db.collection('drills').orderBy('title').get();
    const drills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ success: true, drills });
  } catch (error) {
    console.error('Error fetching drills:', error);
    res.status(500).json({ success: false, error: error.message, drills: [] });
  }
};

exports.createDrill = async (req, res) => {
  try {
    // Verify admin/official
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const drillData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('drills').add(drillData);
    res.json({ success: true, id: docRef.id, message: 'Drill created successfully' });
  } catch (error) {
    console.error('Error creating drill:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDrill = async (req, res) => {
  try {
    // Verify admin/official
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('drills').doc(id).update(updateData);
    res.json({ success: true, message: 'Drill updated successfully' });
  } catch (error) {
    console.error('Error updating drill:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteDrill = async (req, res) => {
  try {
    // Verify admin/official
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'authority') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    await db.collection('drills').doc(id).delete();
    res.json({ success: true, message: 'Drill deleted successfully' });
  } catch (error) {
    console.error('Error deleting drill:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
