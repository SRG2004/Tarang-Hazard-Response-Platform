const admin = require('firebase-admin');
const db = admin.firestore();

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        ...userDoc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Allow users to update their own profile, or admins to update anyone
    if (req.user.uid !== id) {
      const adminDoc = await db.collection('users').doc(req.user.uid).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }
    }

    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Prevent role updates via this endpoint (use /users/:id/role instead)
    delete updateData.role;
    delete updateData.roleOverride;
    delete updateData.uid; // Prevent changing UID
    delete updateData.id;

    await db.collection('users').doc(id).update(updateData);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = db.collection('users');

    if (role) query = query.where('role', '==', role);

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      uid: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message, users: [] });
  }
};

exports.getUserCount = async (req, res) => {
  try {
    const { role } = req.query;
    let query = db.collection('users');

    if (role) query = query.where('role', '==', role);

    const snapshot = await query.count().get();
    res.json({ success: true, count: snapshot.data().count });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ success: false, error: error.message, count: 0 });
  }
};

exports.createUser = async (req, res) => {
  try {
    // Only admins can create specific users this way
    const adminDoc = await db.collection('users').doc(req.user.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only admins can create users' });
    }

    const { email, name, role, aadharId, phoneNumber } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Since we don't have password, we rely on the client to handle auth creation
    // This endpoint just creates the Firestore record
    const userData = {
      email,
      name,
      role: role || 'user',
      aadharId: aadharId || null,
      phoneNumber: phoneNumber || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };

    const docRef = await db.collection('users').add(userData);
    res.json({ success: true, id: docRef.id, message: 'User record created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    // Verify admin
    const adminDoc = await db.collection('users').doc(req.user.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only admins can change roles' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required' });
    }

    // Special check: prevent changing last admin's role
    if (role !== 'admin') {
      const userDoc = await db.collection('users').doc(id).get();
      if (userDoc.exists && userDoc.data().role === 'admin') {
        const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').count().get();
        if (adminsSnapshot.data().count <= 1) {
          return res.status(400).json({ success: false, error: 'Cannot remove the last admin' });
        }
      }
    }

    await db.collection('users').doc(id).update({
      role,
      roleOverride: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    // Verify admin
    const adminDoc = await db.collection('users').doc(req.user.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    
    // Prevent deleting self
    if (id === req.user.uid) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }

    // Try to delete from Firebase Auth
    try {
      await admin.auth().deleteUser(id);
    } catch (authError) {
      console.warn(`User ${id} not found in Firebase Auth or error deleting. Proceeding to delete Firestore record.`);
    }

    // Delete from Firestore
    await db.collection('users').doc(id).delete();
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    // Verify admin
    const adminDoc = await db.collection('users').doc(req.user.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { blocked, reason } = req.body;
    
    // Prevent blocking self
    if (id === req.user.uid) {
      return res.status(400).json({ success: false, error: 'Cannot block yourself' });
    }

    await db.collection('users').doc(id).update({
      status: blocked ? 'blocked' : 'active',
      blockReason: blocked ? (reason || 'No reason provided') : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Optionally disable auth account
    try {
      await admin.auth().updateUser(id, { disabled: blocked });
    } catch (e) {
      console.warn(`Could not disable Auth account for ${id}:`, e);
    }
    
    res.json({ success: true, message: `User ${blocked ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
