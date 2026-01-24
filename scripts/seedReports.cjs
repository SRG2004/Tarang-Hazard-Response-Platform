
const admin = require('firebase-admin');
const serviceAccount = require('../../tarang-484812-firebase-adminsdk-fbsvc-44d4719e71.json'); // Adjust path as needed

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const reports = [
    {
        "analyzedAt": "2026-01-23T21:18:35+05:30",
        "autoRejected": false,
        "confidenceScore": 0.85,
        "createdAt": "2026-01-23T10:45:12+05:30",
        "description": "Severe waterlogging reaching 3 feet in residential areas following Cyclone Senyar remnants. Drain overflow reported.",
        "latitude": 13.0827,
        "location": "13.0827, 80.2707",
        "longitude": 80.2707,
        "photoURL": "https://cdn.example.com/reports/chennai_flood_01.jpg",
        "rejectedAt": null,
        "rejectedBy": null,
        "rejectionReason": null,
        "severity": "high",
        "status": "verified",
        "submittedAt": "2026-01-23T10:40:00+05:30",
        "title": "Chennai Urban Flooding",
        "type": "flood",
        "updatedAt": "2026-01-23T21:18:35+05:30",
        "userId": "uR7x9KJm2AcTjUmVbF41x9zoPLM1",
        "verified": true,
        "videoURL": ""
    },
    {
        "analyzedAt": "2026-01-23T15:20:10+05:30",
        "autoRejected": false,
        "confidenceScore": 0.92,
        "createdAt": "2025-12-29T08:15:34+05:30",
        "description": "Tap water is appearing yellowish and has a strong chemical odor. Multiple neighbors reporting stomach distress.",
        "latitude": 22.7196,
        "location": "22.7196, 75.8577",
        "longitude": 75.8577,
        "photoURL": "https://cdn.example.com/reports/indore_water_quality.jpg",
        "rejectedAt": null,
        "rejectedBy": null,
        "rejectionReason": null,
        "severity": "high",
        "status": "active",
        "submittedAt": "2025-12-29T08:10:22+05:30",
        "title": "Water Contamination Alert",
        "type": "health_hazard",
        "updatedAt": "2026-01-23T15:20:10+05:30",
        "userId": "bKPz2HTW4RcTjUmVbF91x1zoKLA5",
        "verified": true,
        "videoURL": ""
    },
    {
        "analyzedAt": "2026-01-22T19:45:00+05:30",
        "autoRejected": false,
        "confidenceScore": 0.98,
        "createdAt": "2026-01-22T18:30:15+05:30",
        "description": "Massive crowd panic and accident at the railway tracks near Jalgaon. Emergency services needed immediately.",
        "latitude": 21.0077,
        "location": "21.0077, 75.5626",
        "longitude": 75.5626,
        "photoURL": "",
        "rejectedAt": null,
        "rejectedBy": null,
        "rejectionReason": null,
        "severity": "critical",
        "status": "verified",
        "submittedAt": "2026-01-22T18:25:45+05:30",
        "title": "Railway Track Emergency",
        "type": "accident",
        "updatedAt": "2026-01-22T19:45:00+05:30",
        "userId": "jLQm5NSP1BcTjUmVbF22x8zoXMA9",
        "verified": true,
        "videoURL": "https://cdn.example.com/reports/jalgaon_accident_clip.mp4"
    }
];

async function seedReports() {
    const batch = db.batch();

    for (const report of reports) {
        const docRef = db.collection('reports').doc();

        // Convert string dates to Date objects/Timestamps
        const reportData = {
            ...report,
            analyzedAt: report.analyzedAt ? new Date(report.analyzedAt) : null,
            createdAt: report.createdAt ? new Date(report.createdAt) : null,
            submittedAt: report.submittedAt ? new Date(report.submittedAt) : null,
            updatedAt: report.updatedAt ? new Date(report.updatedAt) : null,
        };

        batch.set(docRef, reportData);
    }

    await batch.commit();
    console.log('Successfully seeded reports!');
}

seedReports().catch(console.error);
