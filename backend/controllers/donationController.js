const admin = require('firebase-admin');
const db = admin.firestore();

exports.getDonations = async (req, res) => {
  try {
    const snapshot = await db.collection('donationCampaigns').where('active', '==', true).get();
    let donations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by type if provided
    const { type } = req.query;
    if (type) {
      donations = donations.filter(d => d.type === type);
    }

    res.json({ success: true, donations });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ success: false, error: error.message, donations: [] });
  }
};

exports.processDonation = async (req, res) => {
  try {
    // In a real app, integrate with Stripe, Razorpay, etc.
    const { campaignId, amount, donorName, email, paymentMethod } = req.body;
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const donationRecord = {
      campaignId: campaignId || null,
      amount: parseFloat(amount),
      donorName: donorName || 'Anonymous',
      email: email || null,
      paymentMethod,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to 'donations' collection (distinct from campaigns)
    await db.collection('donations').add(donationRecord);

    // Update campaign raised amount if applicable
    if (campaignId) {
      try {
        await db.collection('donationCampaigns').doc(campaignId).update({
          raised: admin.firestore.FieldValue.increment(parseFloat(amount))
        });
      } catch (e) {
        console.error(`Failed to update campaign ${campaignId} total:`, e);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Donation processed successfully',
      receiptId: `REC-${Math.floor(Math.random() * 1000000)}`
    });
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
