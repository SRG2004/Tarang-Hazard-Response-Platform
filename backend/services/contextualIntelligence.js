const axios = require('axios');
const admin = require('firebase-admin');

/**
 * Gather contextual intelligence for a hazard report
 * @param {Object} report - Report data
 * @param {Object} aiAnalysis - Gemini AI analysis
 * @returns {Promise<Object>} Contextual intelligence data
 */
async function gatherContext(report, aiAnalysis) {
    const context = {
        weather: null,
        historicalMatches: [],
        socialMediaEvidence: {
            viralPosts: [],
            newsArticles: [],
            youtubeVideos: []
        },
        contextScore: 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
        // 1. Weather Verification
        context.weather = await getWeatherData(
            report.latitude,
            report.longitude,
            report.submittedAt
        );

        // 2. Historical Pattern Matching
        context.historicalMatches = await findSimilarPastEvents(
            report.type,
            report.latitude,
            report.longitude,
            report.severity
        );

        // 3. Social Media Cross-Verification
        const keywords = extractKeywords(report.title, report.description);
        const searchQuery = `${keywords.join(' ')} ${report.location || ''}`;

        context.socialMediaEvidence = await searchSocialMedia(
            searchQuery,
            report.location,
            report.submittedAt
        );

        // 4. Calculate Context Score
        context.contextScore = calculateContextScore(context, aiAnalysis);

        return context;
    } catch (error) {
        console.error('Error gathering context:', error);
        return context; // Return partial context
    }
}

/**
 * Get weather data from OpenWeather API
 */
async function getWeatherData(lat, lon, timestamp) {
    const API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!API_KEY) {
        console.warn('OpenWeather API key not configured');
        return null;
    }

    try {
        // Current weather
        const currentRes = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        return {
            current: {
                temperature: currentRes.data.main.temp,
                feelsLike: currentRes.data.main.feels_like,
                humidity: currentRes.data.main.humidity,
                pressure: currentRes.data.main.pressure,
                windSpeed: currentRes.data.wind.speed,
                windDirection: currentRes.data.wind.deg,
                description: currentRes.data.weather[0].description,
                main: currentRes.data.weather[0].main,
                clouds: currentRes.data.clouds.all,
                visibility: currentRes.data.visibility
            },
            isExtreme: isExtremeWeather(currentRes.data),
            location: currentRes.data.name
        };
    } catch (error) {
        console.error('Weather API error:', error.message);
        return null;
    }
}

/**
 * Determine if weather conditions are extreme
 */
function isExtremeWeather(weatherData) {
    return (
        weatherData.wind.speed > 15 || // >54 km/h
        weatherData.main.temp > 40 ||
        weatherData.main.temp < 0 ||
        weatherData.weather[0].main === 'Thunderstorm' ||
        weatherData.weather[0].main === 'Tornado' ||
        weatherData.weather[0].main === 'Squall' ||
        weatherData.main.humidity > 95
    );
}

/**
 * Find similar past events from database
 */
async function findSimilarPastEvents(type, lat, lon, severity) {
    try {
        const reportsRef = admin.firestore().collection('reports');
        const snapshot = await reportsRef
            .where('type', '==', type)
            .where('status', '==', 'verified')
            .get();

        const matches = [];
        const RADIUS_KM = 50;

        snapshot.forEach(doc => {
            const data = doc.data();
            const distance = calculateDistance(
                lat, lon,
                data.latitude, data.longitude
            );

            if (distance <= RADIUS_KM) {
                matches.push({
                    id: doc.id,
                    title: data.title,
                    date: data.submittedAt,
                    distance: Math.round(distance),
                    severity: data.severity,
                    similarity: calculateSimilarity(severity, data.severity, distance)
                });
            }
        });

        matches.sort((a, b) => b.similarity - a.similarity);
        return matches.slice(0, 5);
    } catch (error) {
        console.error('Historical search error:', error);
        return [];
    }
}

/**
 * Search social media for corroborating evidence
 */
async function searchSocialMedia(searchQuery, location, timestamp) {
    const evidence = {
        viralPosts: [],
        newsArticles: [],
        youtubeVideos: []
    };

    try {
        // 1. YouTube Data API
        evidence.youtubeVideos = await searchYouTube(searchQuery, timestamp);

        // 2. Google Custom Search (News)
        evidence.newsArticles = await searchNews(searchQuery, timestamp);

        // 3. Check existing social media feeds (from Live Intelligence)
        evidence.viralPosts = await checkViralPosts(searchQuery, timestamp);

        return evidence;
    } catch (error) {
        console.error('Social media search error:', error);
        return evidence;
    }
}

/**
 * Check for viral posts in social media feed
 */
async function checkViralPosts(query, timestamp) {
    try {
        const feedRef = admin.firestore().collection('socialMediaFeed');
        const oneDayAgo = new Date(timestamp - 24 * 60 * 60 * 1000);

        const snapshot = await feedRef
            .where('timestamp', '>', oneDayAgo)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        const keywords = query.toLowerCase().split(' ');
        const viralPosts = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const content = (data.content || '').toLowerCase();

            // Check if post contains keywords
            const matchCount = keywords.filter(kw => content.includes(kw)).length;

            if (matchCount >= 2) { // At least 2 matching keywords
                viralPosts.push({
                    id: doc.id,
                    platform: data.platform,
                    author: data.author,
                    content: data.content,
                    timestamp: data.timestamp,
                    engagement: data.engagementScore || 0,
                    url: data.url
                });
            }
        });

        // Sort by engagement
        viralPosts.sort((a, b) => b.engagement - a.engagement);
        return viralPosts.slice(0, 3); // Top 3
    } catch (error) {
        console.warn('Viral post check failed:', error.message);
        return [];
    }
}

/**
 * Search YouTube for related videos
 */
async function searchYouTube(query, timestamp) {
    const API_KEY = process.env.YOUTUBE_API_KEY;

    if (!API_KEY) {
        console.warn('YouTube API key not configured');
        return [];
    }

    try {
        const publishedAfter = new Date(timestamp - 24 * 60 * 60 * 1000).toISOString();

        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                q: query,
                type: 'video',
                publishedAfter: publishedAfter,
                maxResults: 5,
                order: 'relevance',
                key: API_KEY
            }
        });

        return response.data.items.map(item => ({
            title: item.snippet.title,
            videoId: item.id.videoId,
            thumbnail: item.snippet.thumbnails.default.url,
            publishedAt: item.snippet.publishedAt,
            channel: item.snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`
        }));
    } catch (error) {
        console.warn('YouTube search failed:', error.message);
        return [];
    }
}

/**
 * Search Google Custom Search for news articles
 */
async function searchNews(query, timestamp) {
    const API_KEY = process.env.GOOGLE_CSE_API_KEY;
    const SEARCH_ENGINE_ID = process.env.GOOGLE_CSE_ID;

    if (!API_KEY || !SEARCH_ENGINE_ID) {
        console.warn('Google Custom Search not configured');
        return [];
    }

    try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: API_KEY,
                cx: SEARCH_ENGINE_ID,
                q: query,
                num: 5,
                dateRestrict: 'd7',
                sort: 'date'
            }
        });

        return response.data.items?.map(item => ({
            title: item.title,
            snippet: item.snippet,
            url: item.link,
            source: item.displayLink,
            publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'],
            isTrustedSource: isTrustedNewsSource(item.displayLink)
        })) || [];
    } catch (error) {
        console.warn('Custom Search failed:', error.message);
        return [];
    }
}

/**
 * Check if source is a trusted news outlet
 */
function isTrustedNewsSource(domain) {
    const trustedDomains = [
        'timesofindia.com', 'hindustantimes.com', 'indianexpress.com',
        'thehindu.com', 'ndtv.com', 'news18.com', 'financialexpress.com',
        'bbc.com', 'reuters.com', 'pti.com'
    ];

    return trustedDomains.some(trusted => domain.includes(trusted));
}

/**
 * Extract keywords from title and description
 */
function extractKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const hazardKeywords = [
        'tsunami', 'flood', 'fire', 'earthquake', 'cyclone',
        'storm', 'erosion', 'landslide', 'drought', 'hurricane'
    ];

    return hazardKeywords.filter(keyword => text.includes(keyword));
}

/**
 * Haversine formula for distance calculation
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function calculateSimilarity(severity1, severity2, distance) {
    const severityScore = severity1 === severity2 ? 1 : 0.5;
    const distanceScore = Math.max(0, 1 - (distance / 50));
    return (severityScore * 0.6) + (distanceScore * 0.4);
}

/**
 * Calculate overall context score (0-1)
 */
function calculateContextScore(context, aiAnalysis) {
    let score = 0;

    // Weather correlation (25%)
    if (context.weather?.isExtreme) {
        score += 0.25;
    }

    // Historical matches (25%)
    if (context.historicalMatches.length > 0) {
        const avgSimilarity = context.historicalMatches.reduce((sum, m) => sum + m.similarity, 0) / context.historicalMatches.length;
        score += avgSimilarity * 0.25;
    }

    // Social media evidence (50%)
    const socialScore = (
        (context.socialMediaEvidence.youtubeVideos.length > 0 ? 0.15 : 0) +
        (context.socialMediaEvidence.newsArticles.length > 0 ? 0.25 : 0) +
        (context.socialMediaEvidence.viralPosts.length > 0 ? 0.10 : 0)
    );
    score += socialScore;

    return Math.min(1, score);
}

module.exports = {
    gatherContext,
    calculateContextScore,
    calculateDistance
};
