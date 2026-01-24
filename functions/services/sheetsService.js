const { google } = require('googleapis');
const admin = require('firebase-admin');

// Initialize Google Sheets API
let sheetsClient = null;

async function getSheetsClient() {
    if (sheetsClient) {
        return sheetsClient;
    }

    try {
        // Use service account from environment or default credentials
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        sheetsClient = google.sheets({ version: 'v4', auth });
        return sheetsClient;
    } catch (error) {
        console.error('Error initializing Sheets client:', error);
        throw error;
    }
}

/**
 * Sync donation to Google Sheets
 */
async function syncDonationToSheets(donationData) {
    try {
        const sheets = await getSheetsClient();
        const spreadsheetId = process.env.GOOGLE_SHEETS_DONATION_SPREADSHEET_ID;

        if (!spreadsheetId) {
            console.warn('Google Sheets spreadsheet ID not configured');
            return { success: false, error: 'Spreadsheet ID not configured' };
        }

        const values = [[
            new Date(donationData.createdAt?.toDate?.() || donationData.createdAt || Date.now()).toLocaleString('en-IN'),
            donationData.userName || 'Anonymous',
            donationData.userEmail || 'N/A',
            donationData.amount || 0,
            donationData.campaignName || 'General',
            donationData.transactionId || 'N/A',
            donationData.status || 'pending'
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Donations!A:G',
            valueInputOption: 'RAW',
            resource: { values }
        });

        console.log('Donation synced to Google Sheets:', donationData.transactionId);
        return { success: true };
    } catch (error) {
        console.error('Error syncing to Google Sheets:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sync analytics data to Google Sheets
 */
async function syncAnalyticsToSheets(analyticsData) {
    try {
        const sheets = await getSheetsClient();
        const spreadsheetId = process.env.GOOGLE_SHEETS_DONATION_SPREADSHEET_ID;

        if (!spreadsheetId) {
            return { success: false, error: 'Spreadsheet ID not configured' };
        }

        const values = [[
            new Date().toLocaleString('en-IN'),
            analyticsData.totalReports || 0,
            analyticsData.totalAlerts || 0,
            analyticsData.totalDonations || 0,
            analyticsData.totalVolunteers || 0
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Analytics!A:E',
            valueInputOption: 'RAW',
            resource: { values }
        });

        return { success: true };
    } catch (error) {
        console.error('Error syncing analytics to Sheets:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cloud Function trigger: Sync donation when created
 */
async function onDonationCreated(snapshot, context) {
    const donationData = snapshot.data();

    // Add the document ID
    donationData.id = snapshot.id;

    // Sync to Google Sheets
    const result = await syncDonationToSheets(donationData);

    // Update the donation document to mark as synced
    if (result.success) {
        await snapshot.ref.update({
            sheetsSynced: true,
            sheetsSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    return result;
}

module.exports = {
    getSheetsClient,
    syncDonationToSheets,
    syncAnalyticsToSheets,
    onDonationCreated
};
