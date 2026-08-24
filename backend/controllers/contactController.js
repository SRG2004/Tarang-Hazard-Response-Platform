const admin = require('firebase-admin');
const db = admin.firestore();

exports.getContacts = async (req, res) => {
  try {
    const snapshot = await db.collection('emergencyContacts').orderBy('name').get();
    const contacts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, error: error.message, contacts: [] });
  }
};

exports.createContact = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const contactData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('emergencyContacts').add(contactData);
    res.json({ success: true, id: docRef.id, message: 'Contact created successfully' });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('emergencyContacts').doc(id).update(updateData);
    res.json({ success: true, message: 'Contact updated successfully' });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    await db.collection('emergencyContacts').doc(id).delete();
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
