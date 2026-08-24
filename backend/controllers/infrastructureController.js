const admin = require('firebase-admin');
const db = admin.firestore();

exports.getInfrastructure = async (req, res) => {
  try {
    const snapshot = await db.collection('emergencyInfrastructure').orderBy('name').get();
    const facilities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ success: true, facilities });
  } catch (error) {
    console.error('Error fetching infrastructure:', error);
    res.status(500).json({ success: false, error: error.message, facilities: [] });
  }
};

exports.createInfrastructure = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    if (!['admin', 'authority'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const facilityData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('emergencyInfrastructure').add(facilityData);
    res.json({ success: true, id: docRef.id, message: 'Infrastructure added successfully' });
  } catch (error) {
    console.error('Error adding infrastructure:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateInfrastructure = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    if (!['admin', 'authority'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('emergencyInfrastructure').doc(id).update(updateData);
    res.json({ success: true, message: 'Infrastructure updated successfully' });
  } catch (error) {
    console.error('Error updating infrastructure:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteInfrastructure = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : null;
    if (!['admin', 'authority'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    await db.collection('emergencyInfrastructure').doc(id).delete();
    res.json({ success: true, message: 'Infrastructure deleted successfully' });
  } catch (error) {
    console.error('Error deleting infrastructure:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
