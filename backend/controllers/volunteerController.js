const admin = require('firebase-admin');
const db = admin.firestore();

exports.getVolunteers = async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('volunteers');

    if (status) query = query.where('status', '==', status);

    const snapshot = await query.get();
    const volunteers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, volunteers });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ success: false, error: error.message, volunteers: [] });
  }
};

exports.registerVolunteer = async (req, res) => {
  try {
    const volunteerData = {
      ...req.body,
      status: 'pending',
      registeredAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('volunteers').add(volunteerData);
    res.json({ success: true, id: docRef.id, message: 'Volunteer registered successfully' });
  } catch (error) {
    console.error('Error registering volunteer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateVolunteerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    await db.collection('volunteers').doc(id).update({
      status,
      notes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: `Volunteer ${status}` });
  } catch (error) {
    console.error('Error updating volunteer status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
