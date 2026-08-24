const admin = require('firebase-admin');
const db = admin.firestore();

exports.getResourceRequests = async (req, res) => {
  try {
    const { requesterId, status } = req.query;
    let query = db.collection('resourceRequests');

    if (requesterId) query = query.where('requesterId', '==', requesterId);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.get();
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.() || doc.data().requestedAt
    }));

    // Sort in memory to avoid needing a composite index
    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching resource requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createResourceRequest = async (req, res) => {
  try {
    // Fetch user details for the requester name
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const requesterName = userDoc.exists ? userDoc.data().name : 'Unknown User';
    const requesterEmail = userDoc.exists ? userDoc.data().email : req.user.email;

    const requestData = {
      ...req.body,
      requesterId: req.user.uid,
      requesterName,
      requesterEmail,
      status: 'pending',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Ensure quantity is a number
    if (requestData.quantity) {
      requestData.quantity = Number(requestData.quantity);
    }

    const docRef = await db.collection('resourceRequests').add(requestData);
    res.json({ success: true, id: docRef.id, message: 'Resource request submitted successfully' });
  } catch (error) {
    console.error('Error creating resource request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateResourceRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (notes) {
      updateData.notes = notes;
    }

    await db.collection('resourceRequests').doc(id).update(updateData);
    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    console.error('Error updating resource request status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
