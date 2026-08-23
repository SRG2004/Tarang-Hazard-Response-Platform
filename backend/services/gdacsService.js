const axios = require('axios');
const Parser = require('rss-parser');

/**
 * GDACS (Global Disaster Alert and Coordination System) Service
 * Fetches real-time disaster alerts globally (Earthquakes, Floods, Cyclones, etc.)
 */
class GdacsService {
    constructor() {
        this.rssUrl = 'https://www.gdacs.org/xml/rss.xml';
        this.parser = new Parser({
            timeout: 10000,
            customFields: {
                item: [
                    ['gdacs:eventtype', 'eventType'],
                    ['gdacs:alertlevel', 'alertLevel'],
                    ['gdacs:country', 'country'],
                    ['geo:Point', 'geoPoint']
                ]
            }
        });
    }

    /**
     * Fetch recent disaster alerts from GDACS
     * @param {number} maxResults Maximum number of alerts to return
     * @returns {Promise<Array>} Array of parsed disaster events
     */
    async getRecentAlerts(maxResults = 5) {
        try {
            console.log('[GDACS] Fetching latest disaster alerts...');
            
            const response = await axios.get(this.rssUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; TarangBot/1.0)',
                    'Accept': 'application/rss+xml, application/xml, text/xml'
                }
            });

            const feed = await this.parser.parseString(response.data);
            const items = feed.items || [];
            
            const alerts = items.slice(0, maxResults).map(item => {
                let locationName = item.country || '';
                
                return {
                    id: `gdacs_${new Date(item.pubDate || Date.now()).getTime()}_${item.guid || Math.random()}`,
                    title: item.title,
                    description: item.description,
                    platform: 'gdacs',
                    url: item.link,
                    author: 'GDACS',
                    timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                    location: locationName ? { name: locationName } : null,
                    text: `${item.title}. ${item.description}`,
                    metadata: {
                        eventType: item.eventType,
                        alertLevel: item.alertLevel
                    }
                };
            });

            console.log(`[GDACS] Found ${alerts.length} recent alerts`);
            return alerts;
        } catch (error) {
            console.error('[GDACS] Error fetching alerts:', error.message);
            return [];
        }
    }
}

module.exports = new GdacsService();
