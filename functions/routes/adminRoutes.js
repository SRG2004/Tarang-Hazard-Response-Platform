const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Middleware to verify admin (optional, for now just verifyAuth)
// const verifyAdmin = ... 

// Seed Defaults Endpoint
router.post('/seed-defaults', async (req, res) => {
    const db = admin.firestore();
    const batch = db.batch();
    let count = 0;

    try {
        // 1. Emergency Infrastructure
        const infraRef = db.collection('emergencyInfrastructure');
        const infraCheck = await infraRef.limit(1).get();
        if (infraCheck.empty) {
            const infraData = [
                {
                    name: 'City General Hospital',
                    type: 'Hospital',
                    location: { lat: 19.0760, lng: 72.8777 }, // Mumbai
                    address: 'Mumbai Central',
                    capacity: 500,
                    status: 'Operational',
                    resources: ['ICU', 'Trauma Center']
                },
                {
                    name: 'Coastal Storm Shelter A',
                    type: 'Shelter',
                    location: { lat: 18.9220, lng: 72.8347 },
                    address: 'Colaba, Mumbai',
                    capacity: 1000,
                    status: 'Standby',
                    resources: ['Food Stock', 'Generators']
                }
            ];
            infraData.forEach(item => {
                const docRef = infraRef.doc();
                batch.set(docRef, item);
                count++;
            });
        }

        // 2. Emergency Contacts
        const contactsRef = db.collection('emergencyContacts');
        const contactsCheck = await contactsRef.limit(1).get();
        if (contactsCheck.empty) {
            const contactsData = [
                { name: 'Coast Guard Control', number: '1554', type: 'Emergency', priority: 'High' },
                { name: 'Disaster Management Cell', number: '1077', type: 'Helpline', priority: 'High' },
                { name: 'Ambulance', number: '102', type: 'Medical', priority: 'Critical' },
                { name: 'Police Control Room', number: '100', type: 'Police', priority: 'Critical' }
            ];
            contactsData.forEach(item => {
                const docRef = contactsRef.doc();
                batch.set(docRef, item);
                count++;
            });
        }

        // 3. Hazard Drills
        const drillsRef = db.collection('hazardDrills');
        const drillsCheck = await drillsRef.limit(1).get();
        if (drillsCheck.empty) {
            const drillsData = [
                {
                    title: 'Annual Tsunami Evacuation',
                    description: 'Evacuation drill for coastal residents.',
                    date: new Date(Date.now() + 86400000 * 14).toISOString(), // 14 days from now
                    location: 'Versova Beach',
                    status: 'Upcoming',
                    type: 'Evacuation',
                    participantsSignedUp: 45
                },
                {
                    title: 'Cyclone Preparedness Workshop',
                    description: 'Training on securing homes and emergency kits.',
                    date: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
                    location: 'Community Center',
                    status: 'Completed',
                    type: 'Training',
                    participantsSignedUp: 120
                }
            ];
            drillsData.forEach(item => {
                const docRef = drillsRef.doc();
                batch.set(docRef, item);
                count++;
            });
        }

        // 4. Volunteers
        const volunteersRef = db.collection('volunteers');
        const volunteersCheck = await volunteersRef.limit(1).get();
        if (volunteersCheck.empty) {
            const volunteersData = [
                {
                    name: 'Rahul Kumar',
                    email: 'rahul.k@example.com',
                    phone: '+919876543210',
                    role: 'Rescue Specialist',
                    skills: ['Swimming', 'First Aid'],
                    status: 'Active',
                    location: { lat: 19.1136, lng: 72.8697 },
                    joinedAt: new Date().toISOString()
                },
                {
                    name: 'Priya Singh',
                    email: 'priya.s@example.com',
                    phone: '+919876543211',
                    role: 'Medical Support',
                    skills: ['Nursing', 'CPR'],
                    status: 'Available',
                    location: { lat: 19.0178, lng: 72.8478 },
                    joinedAt: new Date().toISOString()
                }
            ];
            volunteersData.forEach(item => {
                const docRef = volunteersRef.doc();
                batch.set(docRef, item);
                count++;
            });
        }

        // 5. Donations
        const donationsRef = db.collection('donations');
        const donationsCheck = await donationsRef.limit(1).get();
        if (donationsCheck.empty) {
            const donationsData = [
                {
                    donorName: 'Corporate CSR Initiative',
                    amount: 50000,
                    purpose: 'Emergency Equipment',
                    paymentMethod: 'Bank Transfer',
                    status: 'completed',
                    createdAt: new Date()
                },
                {
                    donorName: 'Local Community Group',
                    amount: 25000,
                    purpose: 'Food Supplies',
                    paymentMethod: 'Online',
                    status: 'completed',
                    createdAt: new Date(Date.now() - 43200000)
                }
            ];
            donationsData.forEach(item => {
                // Donations use timestamps, batch needs Firestore timestamps ideally or JS dates converted?
                // Firestore SDK handles JS Dates well.
                const docRef = donationsRef.doc();
                batch.set(docRef, item);
                count++;
            });
        }

        if (count > 0) {
            await batch.commit();
        }

        res.json({ success: true, message: `Seeded ${count} documents.` });
    } catch (error) {
        console.error('Seeding error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
