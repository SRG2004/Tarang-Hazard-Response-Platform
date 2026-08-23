const axios = require('axios');
const Parser = require('rss-parser');

/**
 * SACHET Service (National Disaster Alert Portal - India)
 * Fetches real-time localized disaster alerts from NDMA/IMD/INCOIS
 */
class SachetService {
    constructor() {
        // Attempting to use a standard All India CAP/RSS feed from SACHET
        this.rssUrl = 'https://sachet.ndma.gov.in/cap_public_website/rss'; 
        this.parser = new Parser({
            timeout: 10000,
            customFields: {
                item: [
                    ['cap:event', 'eventType'],
                    ['cap:severity', 'severity'],
                    ['cap:areaDesc', 'areaDesc'],
                    ['cap:urgency', 'urgency']
                ]
            }
        });
    }

    /**
     * Fetch recent disaster alerts from SACHET (India)
     * @param {number} maxResults Maximum number of alerts to return
     * @returns {Promise<Array>} Array of parsed disaster events
     */
    async getRecentAlerts(maxResults = 5) {
        try {
            console.log('[SACHET] Fetching latest Indian disaster alerts...');
            
            // We use a generic try-catch for the RSS feed, as government portals sometimes change URLs or have downtime
            const response = await axios.get(this.rssUrl, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; TarangBot/1.0)',
                    'Accept': 'application/rss+xml, application/xml, text/xml'
                }
            });

            const feed = await this.parser.parseString(response.data);
            const items = feed.items || [];
            
            const alerts = items.slice(0, maxResults).map(item => {
                let locationName = item.areaDesc || 'India';
                
                return {
                    id: `sachet_${new Date(item.pubDate || Date.now()).getTime()}_${item.guid || Math.random()}`,
                    title: item.title,
                    description: item.description,
                    platform: 'sachet',
                    url: item.link || this.rssUrl,
                    author: 'NDMA/IMD India',
                    timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                    location: { name: locationName },
                    text: `${item.title}. ${item.description}`,
                    metadata: {
                        eventType: item.eventType || 'Alert',
                        severity: item.severity || 'Unknown',
                        urgency: item.urgency || 'Unknown'
                    }
                };
            });

            console.log(`[SACHET] Found ${alerts.length} recent Indian alerts`);
            return alerts;
        } catch (error) {
            console.error('[SACHET] Error fetching Indian alerts (Feed might be down or URL changed):', error.message);
            // Return empty array instead of failing the whole pipeline
            return [];
        }
    }
}

module.exports = new SachetService();
