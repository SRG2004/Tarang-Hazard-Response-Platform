const axios = require('axios');

/**
 * Service to monitor Google Trends for disaster-related keywords
 * Fetches data directly from Google's internal JSON API for real-time updates.
 */
class GoogleTrendsService {
    constructor() {
        this.geo = 'IN';
        this.baseUrl = 'https://trends.google.com/trends/api/dailytrends';
    }

    /**
     * Check for trending disaster topics
     * @returns {Promise<Array>} Array of trending topics related to hazards
     */
    async getTrendingHazards() {
        try {
            console.log('[GoogleTrends] Fetching Daily Trends JSON (Direct API)...');

            const response = await axios.get(this.baseUrl, {
                params: {
                    hl: 'en-US',
                    geo: this.geo,
                    ns: 15,
                },
                responseType: 'text' // Google returns a prefixed JSON string
            });

            // Remove the specialized prefix specific to Google JSON APIs
            const cleanJson = response.data.replace(")]}',", '').trim();
            const parsedData = JSON.parse(cleanJson);

            const days = parsedData.default.trendingSearchesDays;
            const todaysTrends = days[0]?.trendingSearches || [];

            const hazardKeywords = [
                'earthquake', 'tsunami', 'cyclone', 'flood', 'storm',
                'landslide', 'cloudburst', 'hurricane', 'typhoon',
                'भूकंप', 'सुनामी', 'बाढ़', 'चक्रवात', // Hindi
                'புயல்', 'வெள்ளம்', // Tamil
                'తుఫాను', 'వరద' // Telugu
            ];

            const trendingHazards = [];

            for (const item of todaysTrends) {
                const title = item.title.query.toLowerCase();
                // Check related queries too
                const related = item.relatedQueries ? item.relatedQueries.map(q => q.query.toLowerCase()).join(' ') : '';
                const fullText = `${title} ${related}`;

                // precise keyword matching
                const matchedKeyword = hazardKeywords.find(keyword =>
                    fullText.includes(keyword)
                );

                if (matchedKeyword) {
                    trendingHazards.push({
                        id: `trend_${new Date().getTime()}_${matchedKeyword}`,
                        keyword: item.title.query,
                        traffic: item.formattedTraffic,
                        snippet: item.articles ? item.articles[0].title : item.title.query,
                        url: item.articles ? item.articles[0].url : `https://google.com/search?q=${item.title.query}`,
                        platform: 'google_trends',
                        timestamp: new Date().toISOString(),
                        hazardType: matchedKeyword,
                        isTrending: true,
                        articles: item.articles // Keep raw articles for context
                    });
                }
            }

            console.log(`[GoogleTrends] Found ${trendingHazards.length} hazard trends from ${todaysTrends.length} total trends.`);
            return trendingHazards;
        } catch (error) {
            console.error('[GoogleTrends] Error fetching trends:', error.message);
            return [];
        }
    }
}

module.exports = new GoogleTrendsService();
