const axios = require('axios');
const Parser = require('rss-parser');

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const BASE_URL = 'https://gnews.io/api/v4';

// Keywords for ocean hazard news
const HAZARD_KEYWORDS = [
  'tsunami',
  'storm surge',
  'coastal flooding',
  'high waves',
  'cyclone',
  'hurricane',
  'typhoon',
  'marine warning',
  'coastal erosion',
  'rough sea',
  'tidal wave',
  'ocean hazard',
  'coastal damage',
  'sea level rise',
  'rip current'
];

// RSS feed sources for fallback
const RSS_FEEDS = [
  {
    name: 'Times of India',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    language: 'en'
  },
  {
    name: 'The Hindu',
    url: 'https://www.thehindu.com/news/national/?service=rss',
    language: 'en'
  },
  {
    name: 'NDTV',
    url: 'https://feeds.feedburner.com/ndtvnews-india-news',
    language: 'en'
  },
  {
    name: 'Hindustan Times',
    url: 'https://www.hindustantimes.com/rss/india/rssfeed.xml',
    language: 'en'
  },
  {
    name: 'Indian Express',
    url: 'https://indianexpress.com/section/india/feed/',
    language: 'en'
  }
];

/**
 * Search for news articles related to ocean hazards using GNews API with RSS fallback
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results
 * @param {string} lang - Language code (en, hi, ta, etc.)
 * @returns {Promise<Array>} Array of news articles
 */
async function searchNews(query, maxResults = 10, lang = 'en') {
  // Try GNews API first
  if (GNEWS_API_KEY) {
    try {
      console.log(`Searching GNews API for: "${query}"`);
      const response = await axios.get(`${BASE_URL}/search`, {
        params: {
          q: query,
          token: GNEWS_API_KEY,
          lang: lang,
          country: 'in', // Focus on India
          max: maxResults,
          sortby: 'publishedAt'
        }
      });

      const articles = response.data.articles || [];
      console.log(`Found ${articles.length} articles via GNews API`);
      return articles;
    } catch (error) {
      console.error('GNews API failed:', error.response?.data?.error?.message || error.message);
      console.log('Falling back to RSS feeds...');
    }
  } else {
    console.log('GNews API key not configured, using RSS fallback');
  }

  // Fallback to RSS feeds
  const parser = new Parser({
    customFields: {
      item: [
        ['pubDate', 'pubDate'],
        ['description', 'description'],
        ['content:encoded', 'content'],
        ['media:content', 'media'],
        ['media:thumbnail', 'thumbnail']
      ]
    },
    timeout: 10000,
  });

  const allArticles = [];

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`Trying RSS feed: ${feed.name}`);

      const response = await axios.get(feed.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TarangBot/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      const parsedFeed = await parser.parseString(response.data);
      const feedArticles = parsedFeed.items || [];

      // Filter articles that contain the query keywords
      const relevantArticles = feedArticles.filter(item => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const queryLower = query.toLowerCase();

        return title.includes(queryLower) || description.includes(queryLower);
      });

      // Format RSS articles to match GNews format
      const formattedArticles = relevantArticles.slice(0, Math.ceil(maxResults / RSS_FEEDS.length)).map(item => ({
        title: item.title || 'No title',
        description: cleanText(item.description || ''),
        content: cleanText(item.content || item.description || ''),
        url: item.link || item.guid,
        source: { name: feed.name },
        author: feed.name,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        image: item.thumbnail?.$?.url || item.media?.$?.url || null,
        platform: 'rss',
        feedSource: feed.name
      }));

      allArticles.push(...formattedArticles);

      // Rate limiting between feeds
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error fetching RSS feed ${feed.name}:`, error.message);
    }
  }

  // Remove duplicates based on URL
  const uniqueArticles = Array.from(
    new Map(allArticles.map(article => [article.url, article])).values()
  );

  console.log(`Found ${uniqueArticles.length} articles via RSS feeds`);
  return uniqueArticles.slice(0, maxResults);
}

/**
 * Get top headlines related to ocean hazards
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of news articles
 */
async function getTopHeadlines(maxResults = 10) {
  try {
    const response = await axios.get(`${BASE_URL}/top-headlines`, {
      params: {
        token: GNEWS_API_KEY,
        country: 'in',
        max: maxResults,
        topic: 'breaking-news', // Focus on breaking news
        lang: 'en'
      }
    });

    return response.data.articles || [];
  } catch (error) {
    console.error('Error fetching top headlines from GNews:', error.message);
    return [];
  }
}

/**
 * Monitor news for ocean hazard reports
 * @param {number} maxArticles - Maximum articles to fetch
 * @returns {Promise<Array>} Array of hazard-related news articles
 */
async function monitorHazardNews(maxArticles = 20) {
  console.log('Monitoring news for ocean hazards...');
  const allArticles = [];

  // Search for each hazard keyword
  const keywordsToSearch = HAZARD_KEYWORDS.slice(0, 5); // Limit to avoid rate limits
  
  for (const keyword of keywordsToSearch) {
    try {
      console.log(`Searching news for: ${keyword}`);
      const articles = await searchNews(keyword, 5, 'en');
      
      // Format articles
      const formattedArticles = articles.map(article => ({
        id: `gnews_${article.url.split('/').pop()}`,
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        source: article.source.name,
        author: article.source.name,
        publishedAt: article.publishedAt,
        image: article.image,
        platform: 'gnews',
        searchKeyword: keyword
      }));

      allArticles.push(...formattedArticles);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error searching for "${keyword}":`, error.message);
    }
  }

  // Remove duplicates based on URL
  const uniqueArticles = Array.from(
    new Map(allArticles.map(article => [article.url, article])).values()
  );

  console.log(`Found ${uniqueArticles.length} unique news articles about ocean hazards.`);
  return uniqueArticles.slice(0, maxArticles);
}

/**
 * Get news by specific location
 * @param {string} location - Location name
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of news articles
 */
async function getNewsByLocation(location, maxResults = 5) {
  const queries = [
    `${location} tsunami`,
    `${location} coastal flooding`,
    `${location} storm surge`,
    `${location} cyclone`,
    `${location} ocean hazard`
  ];

  const allArticles = [];

  for (const query of queries) {
    try {
      const articles = await searchNews(query, 2, 'en');
      allArticles.push(...articles.map(article => ({
        ...article,
        platform: 'gnews',
        searchLocation: location
      })));

      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Error fetching news for ${location}:`, error.message);
    }
  }

  // Remove duplicates
  const uniqueArticles = Array.from(
    new Map(allArticles.map(article => [article.url, article])).values()
  );

  return uniqueArticles.slice(0, maxResults);
}

/**
 * Monitor news in multiple Indian languages
 * @returns {Promise<Array>} Array of multilingual news articles
 */
async function monitorMultilingualNews() {
  const languages = [
    { code: 'en', keywords: ['tsunami India', 'coastal hazard India'] },
    { code: 'hi', keywords: ['सुनामी', 'तटीय खतरा'] },
    { code: 'ta', keywords: ['சுனாமி', 'கடலோர அபாயம்'] }
  ];

  const allArticles = [];

  for (const lang of languages) {
    for (const keyword of lang.keywords) {
      try {
        const articles = await searchNews(keyword, 3, lang.code);
        allArticles.push(...articles.map(article => ({
          ...article,
          platform: 'gnews',
          language: lang.code,
          searchKeyword: keyword
        })));

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error fetching ${lang.code} news:`, error.message);
      }
    }
  }

  return allArticles;
}

/**
 * Clean text from HTML entities and formatting
 */
function cleanText(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

module.exports = {
  searchNews,
  getTopHeadlines,
  monitorHazardNews,
  getNewsByLocation,
  monitorMultilingualNews,
  HAZARD_KEYWORDS,
  cleanText
};
