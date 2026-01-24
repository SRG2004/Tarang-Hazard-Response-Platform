const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { Parser } = require('json2csv');

const db = admin.firestore();

// Helper to format date
const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toISOString();
};

// Generic export handler
router.post('/:type', async (req, res) => {
    try {
        const { type } = req.params; // reports, users, volunteers, donations
        const { format, startDate, endDate } = req.body;

        let collectionName = type;
        if (type === 'donations') collectionName = 'donations'; // already correct but just in case

        // Validate type
        const validTypes = ['reports', 'users', 'volunteers', 'donations'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid data type' });
        }

        let query = db.collection(collectionName);

        // Apply date filtering if applicable (createdAt)
        if (startDate) {
            // Simple date parsing, can be improved
            // Assuming 'all', 'today', 'week', 'month', 'year' from frontend
            // OR a specific ISO string if passed differently. 
            // The frontend passed { startDate: dateRange } where dateRange is 'today', 'week' etc.

            let start = new Date();
            let field = 'createdAt';

            if (startDate === 'today') {
                start.setHours(0, 0, 0, 0);
            } else if (startDate === 'week') {
                start.setDate(start.getDate() - 7);
            } else if (startDate === 'month') {
                start.setDate(start.getDate() - 30);
            } else if (startDate === 'year') {
                start.setFullYear(start.getFullYear() - 1);
            } else if (startDate === 'all') {
                start = new Date(0); // Epoch
            }

            query = query.where(field, '>=', admin.firestore.Timestamp.fromDate(start));
        }

        const snapshot = await query.get();
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            // Flatten or format specific fields based on type
            if (type === 'reports') {
                return {
                    id: doc.id,
                    title: d.title,
                    type: d.type,
                    severity: d.severity,
                    status: d.status,
                    location: d.location,
                    createdAt: d.createdAt?.toDate?.()?.toISOString() || '',
                    description: d.description
                };
            } else if (type === 'users') {
                // Protect PII if needed, but this is an admin/authorized export
                return {
                    uid: doc.id,
                    name: d.name,
                    email: d.email,
                    role: d.role,
                    createdAt: d.createdAt?.toDate?.()?.toISOString() || ''
                };
            }
            return { id: doc.id, ...d };
        });

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${type}.json`);
            return res.json(data);
        } else if (format === 'csv') {
            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(data);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
            return res.send(csv);
        } else {
            // Default or excel (csv for now)
            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(data);
            res.setHeader('Content-Type', 'text/csv');
            return res.send(csv);
        }

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
