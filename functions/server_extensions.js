// ==================== DONATIONS ====================
app.get('/donations', async (req, res) => {
    try {
        const snapshot = await db.collection('donationCampaigns').where('active', '==', true).get();
        let donations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // If no campaigns found, return default seed data to avoid empty UI
        if (donations.length === 0) {
            donations = [
                {
                    id: 'flood-relief',
                    title: 'Flood Relief Fund',
                    description: 'Support families affected by recent floods',
                    goal: 100000,
                    raised: 75000,
                    link: null
                },
                {
                    id: 'medical-aid',
                    title: 'Emergency Medical Aid',
                    description: 'Medical supplies for disaster zones',
                    goal: 80000,
                    raised: 45000,
                    link: null
                }
            ];
        }

        res.json({ success: true, donations });
    } catch (error) {
        console.error('Error fetching donations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Process a new donation (from Google Pay)
app.post('/donations/process', async (req, res) => {
    try {
        const { campaignId, amount, donorName, donorPhone, message, paymentData } = req.body;

        const donationRecord = {
            campaignId,
            amount: parseFloat(amount),
            donorName,
            donorPhone,
            message,
            paymentData: paymentData || null, // In production, verify this token
            status: 'completed', // In test mode, we assume success
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to 'donations' collection (distinct from campaigns)
        await db.collection('donations').add(donationRecord);

        // Update campaign raised amount if it exists in DB
        if (campaignId && campaignId !== 'flood-relief' && campaignId !== 'medical-aid') {
            try {
                await db.collection('donationCampaigns').doc(campaignId).update({
                    raised: admin.firestore.FieldValue.increment(parseFloat(amount))
                });
            } catch (e) {
                console.warn("Could not update campaign total", e);
            }
        }

        res.json({ success: true, message: 'Donation processed successfully' });
    } catch (error) {
        console.error('Error processing donation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
