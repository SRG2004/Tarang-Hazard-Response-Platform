/**
 * Seed script for hazard drills
 * Run with: node scripts/seedDrills.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const drills = [
    {
        title: "Tsunami Evacuation Drill",
        type: "tsunami",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        location: "Coastal Zone A, Marina Beach, Chennai",
        participants: 250,
        duration: "2 hours",
        description: "Community-wide tsunami evacuation drill covering coastal areas. All residents within 1km of coastline should participate.",
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        title: "Earthquake Response Training",
        type: "earthquake",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        location: "Government School Complex, Sector 5",
        participants: 500,
        duration: "3 hours",
        description: "Drop, Cover, and Hold On training with building evacuation procedures for school staff and students.",
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        title: "Cyclone Preparedness Workshop",
        type: "cyclone",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        location: "Community Hall, Ward 12",
        participants: 150,
        duration: "4 hours",
        description: "Interactive workshop on cyclone preparedness, shelter identification, and emergency kit preparation.",
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        title: "Flood Evacuation Exercise",
        type: "flood",
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks from now
        location: "Low-lying Areas, River Basin District",
        participants: 300,
        duration: "5 hours",
        description: "Full-scale flood evacuation exercise including boat rescue operations and temporary shelter setup.",
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        title: "Fire Safety and Evacuation Drill",
        type: "fire",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        location: "Central Business District, Commercial Complex",
        participants: 400,
        duration: "1.5 hours",
        description: "Fire evacuation drill covering high-rise buildings, including stairwell usage and assembly point procedures.",
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        title: "Landslide Alert Response Training",
        type: "landslide",
        date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks from now
        location: "Hill Station Community Center, Nilgiris",
        participants: 120,
        duration: "3 hours",
        description: "Training on early warning signs of landslides and safe evacuation routes for hill communities.",
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        title: "Multi-Hazard Emergency Response",
        type: "multi-hazard",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago (completed)
        location: "District Emergency Operations Center",
        participants: 75,
        duration: "6 hours",
        description: "Comprehensive training for emergency responders covering multiple hazard scenarios and coordination protocols.",
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
        title: "Chemical Spill Response Drill",
        type: "chemical",
        date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(), // 5 weeks from now
        location: "Industrial Estate, Zone B",
        participants: 200,
        duration: "4 hours",
        description: "Industrial hazard response drill including evacuation, decontamination, and medical triage procedures.",
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
];

async function seedDrills() {
    console.log('Starting to seed hazard drills...');

    const batch = db.batch();

    for (const drill of drills) {
        const docRef = db.collection('drills').doc();
        batch.set(docRef, drill);
        console.log(`Added: ${drill.title}`);
    }

    await batch.commit();
    console.log(`\nSuccessfully seeded ${drills.length} hazard drills!`);
    process.exit(0);
}

seedDrills().catch(error => {
    console.error('Error seeding drills:', error);
    process.exit(1);
});
