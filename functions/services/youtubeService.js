const axios = require('axios');
const Parser = require('rss-parser');

/**
 * YouTube Service for fetching videos and comments related to ocean hazards
 * Uses YouTube Data API v3 with Invidious RSS fallback
 */
class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';

    // Invidious instances for fallback
    this.invidiousInstances = [
      'https://invidious.snopyta.org',
      'https://invidious.kavin.rocks',
      'https://invidious.tiekoetter.com',
      'https://invidious.flokinet.to'
    ];
    this.currentInvidiousIndex = 0;

    this.parser = new Parser({
      customFields: {
        item: [
          ['guid', 'guid'],
          ['pubDate', 'pubDate'],
          ['author', 'author'],
          ['description', 'description']
        ]
      },
      timeout: 10000,
    });

    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 1500; // 1.5 seconds between requests
  }

  /**
   * Check if API is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Search for videos with hazard-related keywords using YouTube API with Invidious fallback
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   */
  async searchVideos(query, maxResults = 25) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    // Try YouTube API first
    if (this.isConfigured()) {
      try {
        console.log(`Searching YouTube API for: "${query}"`);
        const response = await axios.get(`${this.baseURL}/search`, {
          params: {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: Math.min(maxResults, 50),
            key: this.apiKey,
            order: 'relevance',
            relevanceLanguage: 'en,hi,ta,te,ml', // Indian languages
            regionCode: 'IN', // India
          },
        });

        const videos = response.data.items || [];
        const formattedVideos = videos.map(video => ({
          id: video.id.videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          text: `${video.snippet.title} ${video.snippet.description}`,
          platform: 'youtube',
          author: video.snippet.channelTitle,
          authorId: video.snippet.channelId,
          timestamp: video.snippet.publishedAt,
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          thumbnail: video.snippet.thumbnails?.default?.url,
        }));

        console.log(`Found ${formattedVideos.length} videos via YouTube API`);
        return formattedVideos;
      } catch (error) {
        console.error('YouTube API failed:', error.response?.data?.error?.message || error.message);
        console.log('Falling back to Invidious...');
      }
    } else {
      console.log('YouTube API key not configured, using Invidious fallback');
    }

    // Fallback to Invidious RSS feeds
    for (let attempt = 0; attempt < this.invidiousInstances.length; attempt++) {
      try {
        const instance = this.invidiousInstances[this.currentInvidiousIndex];
        const encodedQuery = encodeURIComponent(query);
        const rssUrl = `${instance}/search?q=${encodedQuery}&type=video&sort=relevance`;

        console.log(`Trying Invidious (${instance}): ${rssUrl}`);

        const response = await axios.get(rssUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TarangBot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        });

        if (response.status !== 200) {
          console.error(`HTTP ${response.status} from ${instance}`);
          this.currentInvidiousIndex = (this.currentInvidiousIndex + 1) % this.invidiousInstances.length;
          continue;
        }

        const feed = await this.parser.parseString(response.data);
        const videos = [];

        if (feed && feed.items) {
          for (const item of feed.items.slice(0, maxResults)) {
            const video = this.parseInvidiousVideo(item);
            if (video) {
              videos.push(video);
            }
          }
        }

        console.log(`Found ${videos.length} videos via Invidious (${instance})`);
        return videos;

      } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        console.error(`Error with Invidious instance ${this.invidiousInstances[this.currentInvidiousIndex]}:`, errorMsg);

        this.currentInvidiousIndex = (this.currentInvidiousIndex + 1) % this.invidiousInstances.length;

        if (attempt === this.invidiousInstances.length - 1) {
          console.error('All Invidious instances failed. No videos found.');
          return [];
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return [];
  }

  /**
   * Get comments from a video using YouTube API (no fallback available)
   * @param {string} videoId - YouTube video ID
   * @param {number} maxResults - Maximum number of comments
   */
  async getVideoComments(videoId, maxResults = 100) {
    if (!this.isConfigured()) {
      console.warn('YouTube API key not configured, cannot fetch comments');
      return [];
    }

    try {
      console.log(`Fetching comments for video: ${videoId}`);
      const response = await axios.get(`${this.baseURL}/commentThreads`, {
        params: {
          part: 'snippet',
          videoId: videoId,
          maxResults: Math.min(maxResults, 100),
          key: this.apiKey,
          order: 'relevance',
        },
      });

      const comments = response.data.items || [];
      const formattedComments = comments.map(item => {
        const comment = item.snippet.topLevelComment.snippet;
        return {
          id: item.id,
          text: comment.textDisplay,
          platform: 'youtube',
          author: comment.authorDisplayName,
          authorId: comment.authorChannelId?.value,
          timestamp: comment.publishedAt,
          url: `https://www.youtube.com/watch?v=${videoId}&lc=${item.id}`,
          videoId: videoId,
          metrics: {
            likes: comment.likeCount || 0,
          },
        };
      });

      console.log(`Found ${formattedComments.length} comments for video ${videoId}`);
      return formattedComments;
    } catch (error) {
      console.error(`Error fetching comments for video ${videoId}:`, error.response?.data?.error?.message || error.message);
      return [];
    }
  }

  /**
   * Search for ocean hazard-related videos
   */
  async searchHazardVideos(maxResults = 50) {
    const allVideos = [];
    const processedQueries = new Set();

    // Search coastal cities with top keywords
    const coastalCities = ['Mumbai', 'Chennai', 'Kolkata', 'Kochi', 'Vizag', 'Puri'];
    const hazards = ['cyclone', 'flood', 'tsunami', 'storm', 'heavy rain'];

    for (const city of coastalCities) {
      for (const hazard of hazards) {
        const query = `${hazard} ${city} live news`; // Prioritize live news coverage
        if (processedQueries.has(query)) continue;
        processedQueries.add(query);

        try {
          // console.log(`  [YouTube] Searching: "${query}"`);
          const videos = await this.searchVideos(query, 3); // Get top 3 per city/hazard
          allVideos.push(...videos);

          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit

          if (allVideos.length >= maxResults) break;
        } catch (e) {
          console.error(`  [YouTube] Error for "${query}": ${e.message}`);
        }
      }
      if (allVideos.length >= maxResults) break;
    }

    // New: Specific search for "Shorts" #shorts which are often raw footage
    if (allVideos.length < maxResults) {
      try {
        const shortsQuery = 'India flood disaster raw footage #shorts';
        const shorts = await this.searchVideos(shortsQuery, 5);
        allVideos.push(...shorts);
      } catch (e) {
        console.error('Error fetching shorts:', e);
      }
    }

    // Remove duplicates
    const uniqueVideos = Array.from(
      new Map(allVideos.map(video => [video.id, video])).values()
    );

    return uniqueVideos.slice(0, maxResults);
  }

  /**
   * Get comments from hazard-related videos
   */
  async getHazardComments(maxResults = 100) {
    // First, get hazard-related videos
    const videos = await this.searchHazardVideos(10); // Get fewer videos, more comments each

    const allComments = [];

    for (const video of videos) {
      try {
        const comments = await this.getVideoComments(video.id, Math.ceil(maxResults / videos.length));
        allComments.push(...comments);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error fetching comments for video ${video.id}:`, error.message);
      }
    }

    return allComments.slice(0, maxResults);
  }

  /**
   * Parse Invidious RSS feed item into video object
   * @param {Object} item - RSS feed item
   */
  parseInvidiousVideo(item) {
    try {
      // Extract video ID from link
      const link = item.link || '';
      const videoIdMatch = link.match(/\/watch\?v=([a-zA-Z0-9_-]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : `invidious_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Extract author from title (format: "Channel Name: Video Title")
      const title = item.title || '';
      const authorMatch = title.match(/^([^:]+):\s*(.+)$/);
      let author = 'unknown';
      let videoTitle = title;

      if (authorMatch) {
        author = authorMatch[1].trim();
        videoTitle = authorMatch[2].trim();
      }

      // Clean description
      const description = this.cleanText(item.description || '');

      return {
        id: videoId,
        title: videoTitle,
        description: description,
        text: `${videoTitle} ${description}`,
        platform: 'youtube',
        author: author,
        authorId: `invidious_${author.replace(/\s+/g, '_').toLowerCase()}`,
        timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: null, // Invidious RSS doesn't include thumbnails
      };
    } catch (error) {
      console.error('Error parsing Invidious video:', error);
      return null;
    }
  }

  /**
   * Clean text from HTML entities and formatting
   */
  cleanText(text) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
  }
}

module.exports = new YouTubeService();

