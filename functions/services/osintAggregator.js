const youtubeService = require('./youtubeService');
const googleTrendsService = require('./googleTrendsService');
const gnewsService = require('./gnewsService');
const geminiService = require('./geminiService');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * OSINT Aggregator - The core intelligence engine
 * Orchestrates fetching from Google Tech sources and verifying with Gemini
 */
class OsintAggregator {

    /**
     * Process a raw item (video, news, trend) through Gemini
     */
    async processItem(item, type) {
        const text = item.text || item.description || item.title || '';
        if (!text || text.length < 10) return null;

        try {
            // Analyze with Gemini
            const analysis = await geminiService.analyzeHazardContext(text, type);

            if (!analysis.isHazard || analysis.confidence < 0.7) {
                // console.log(`[OSINT] Filtered out ${type}: Not a hazard (${analysis.confidence})`);
                return null;
            }

            console.log(`[OSINT] Hazard Verified: ${analysis.hazardType} (${analysis.confidence})`);

            // Extract location if missing
            let location = item.location;
            if (!location && analysis.location) {
                // Simple location structure for now
                location = { name: analysis.location };
            }

            return {
                id: item.id,
                title: item.title || text.substring(0, 50),
                description: text,
                platform: item.platform || type,
                url: item.url,
                author: item.author || 'system',
                timestamp: item.timestamp || new Date().toISOString(),
                location: location,
                aiAnalysis: {
                    isHazard: analysis.isHazard,
                    confidence: analysis.confidence,
                    hazardType: analysis.hazardType,
                    severity: analysis.severity,
                    summary: analysis.summary
                },
                sourceType: type, // 'youtube', 'news', 'trend'
                verified: true, // algorithmically verified
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            };
        } catch (error) {
            console.error('[OSINT] Processing error:', error.message);
            return null;
        }
    }

    /**
     * Batch save verified items to Firestore
     */
    async saveItems(items) {
        if (items.length === 0) return 0;

        const batch = db.batch();
        const collection = db.collection('osintReports');
        let count = 0;

        for (const item of items) {
            // Use efficient ID if possible to prevent duplicates
            const docId = `${item.platform}_${item.id}`.replace(/\//g, '_');
            const docRef = collection.doc(docId);
            batch.set(docRef, item, { merge: true });
            count++;
        }

        await batch.commit();
        return count;
    }

    /**
     * Run the full aggregation pipeline
     */
    async runAggregationPipeline() {
        console.log('--- Starting OSINT Pipeline ---');
        const start = Date.now();
        const stats = { trends: 0, news: 0, youtube: 0, saved: 0 };

        try {
            // 1. Google Trends (Fastest, High Signal)
            const trends = await googleTrendsService.getTrendingHazards();
            stats.trends = trends.length;

            // 2. Google News (Verified Sources)
            // Filter news based on trends if any found, else use default keywords
            let newsItems = [];
            if (trends.length > 0) {
                for (const trend of trends) {
                    const trendNews = await gnewsService.searchNews(trend.keyword, 3);
                    newsItems.push(...trendNews);
                }
            } else {
                newsItems = await gnewsService.monitorHazardNews(15);
            }
            stats.news = newsItems.length;

            // 3. YouTube (Visual Verification)
            const videos = await youtubeService.searchHazardVideos(15);
            stats.youtube = videos.length;

            // 4. Process All
            const allRaw = [...trends, ...newsItems, ...videos];
            console.log(`[OSINT] Processing ${allRaw.length} raw items...`);

            const refinedItems = [];
            for (const raw of allRaw) {
                const processed = await this.processItem(raw, raw.platform || 'unknown');
                if (processed) refinedItems.push(processed);
                // Rate limiting for Gemini
                await new Promise(r => setTimeout(r, 500));
            }

            // 5. Save
            const savedCount = await this.saveItems(refinedItems);
            stats.saved = savedCount;
            stats.duration = Date.now() - start;

            console.log(`[OSINT] Pipeline Complete. Saved ${savedCount} verified reports.`);
            return stats;

        } catch (error) {
            console.error('[OSINT] Pipeline Failed:', error);
            throw error;
        }
    }
}

module.exports = new OsintAggregator();
