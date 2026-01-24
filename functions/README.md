# Tarang Backend API

Backend API server for Tarang - Ocean Hazard Reporting & Monitoring Platform.

## Features

- **AI-Powered Monitoring**: Google Gemini AI for context-aware hazard detection
- **Social Media Monitoring**: Twitter, Facebook, YouTube with intelligent filtering
- **Weather Integration**: OpenWeather API for real-time coastal weather conditions
- **News Monitoring**: GNews API for hazard-related news articles
- **Multi-Source Intelligence**: Combines 5+ data sources for comprehensive monitoring
- **Real-time Firestore Integration**: Live data synchronization
- **Automated Scheduling**: Continuous monitoring with node-cron
- **RESTful API**: Complete API for frontend integration

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=3001

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# AI & NLP APIs
GEMINI_API_KEY=your-gemini-api-key                    # ⭐ REQUIRED for AI monitoring
HUGGINGFACE_API_KEY=your-huggingface-api-key          # Optional (legacy)

# Weather & News APIs
WEATHERSTACK_API_KEY=your-weatherstack-api-key        # ⭐ REQUIRED for weather monitoring (95 calls/month limit)
GNEWS_API_KEY=your-gnews-api-key                      # ⭐ REQUIRED for news monitoring

# Social Media API Keys (Optional but Recommended)
# Twitter API keys removed - now using Nitter (free, privacy-focused alternative)
# NITTER_INSTANCE=https://nitter.net (optional - defaults to nitter.net)

FACEBOOK_ACCESS_TOKEN=your-facebook-access-token
FACEBOOK_PAGE_ID=your-facebook-page-id

YOUTUBE_API_KEY=your-youtube-api-key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Settings
FRONTEND_URL=http://localhost:3000
ENABLE_SCHEDULED_MONITORING=true
```

#### Getting API Keys (Free Tiers Available)

| Service | URL | Free Tier | Notes |
|---------|-----|-----------|-------|
| **Gemini AI** | [makersuite.google.com](https://makersuite.google.com/app/apikey) | 60/min, 1500/day | ⭐ Required |
| **Weatherstack** | [weatherstack.com](https://weatherstack.com/) | 95/month (free tier) | ⭐ Required |
| **GNews** | [gnews.io](https://gnews.io/) | 100/day | ⭐ Required |
| Twitter | [developer.twitter.com](https://developer.twitter.com) | Limited | Optional |
| Facebook | [developers.facebook.com](https://developers.facebook.com) | Varies | Optional |
| YouTube | [console.cloud.google.com](https://console.cloud.google.com) | 10,000/day | Optional |

### 3. Test the AI Monitoring System

Before starting the server, test the new AI monitoring:

```bash
node test-ai-monitoring.js
```

This will:
- ✓ Check API key configuration
- ✓ Test Gemini AI hazard detection
- ✓ Test weather service integration
- ✓ Test news monitoring
- ✓ Run a full monitoring cycle (optional)

### 4. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3001` and automatically begin monitoring if enabled.

## API Endpoints

### Health Check
- `GET /api/health` - Check API health

### AI-Powered Monitoring
- `POST /api/social-media/monitor` - Trigger monitoring
  - Body: `{ "platform": "all" }` (options: all, twitter, facebook, youtube, weather, news)
- `POST /api/ai/analyze-text` - Test AI hazard detection
  - Body: `{ "text": "your text here", "source": "test" }`

### Weather Data
- `GET /api/weather/current?lat=19.0760&lon=72.8777` - Get current weather and hazard assessment

### Social Media (Legacy)
- `POST /api/social-media/process` - Process social media posts
- `GET /api/social-media/reports` - Get social media reports

### NLP (Legacy)
- `POST /api/nlp/analyze` - Analyze text for hazards (old keyword-based method)

## Social Media API Setup

### Twitter API v2

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Get API Key, API Secret, and Bearer Token
4. Add to `.env` file

### Facebook Graph API

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Get App ID and App Secret
4. Generate Access Token (requires proper permissions)
5. Add to `.env` file

**Note:** Facebook API has strict limitations on public post access. You may need to:
- Request Page Public Content Access permission
- Use a specific page ID to monitor
- Set up proper OAuth flow for long-lived tokens

### YouTube Data API v3

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create API Key
5. Add to `.env` file

## Scheduled Monitoring

The server automatically monitors social media platforms every 30 minutes if `ENABLE_SCHEDULED_MONITORING=true`.

To disable scheduled monitoring, set:
```env
ENABLE_SCHEDULED_MONITORING=false
```

## Testing & Manual Monitoring

### Test AI Hazard Detection

```bash
curl -X POST http://localhost:3001/api/ai/analyze-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Tsunami warning issued for east coast of India",
    "source": "test"
  }'
```

Expected response:
```json
{
  "success": true,
  "analysis": {
    "isHazard": true,
    "confidence": 0.95,
    "hazardType": "Tsunami",
    "severity": "critical",
    "location": "East coast of India",
    "summary": "Official tsunami warning for coastal regions",
    "reasoning": "Text contains official warning about tsunami hazard"
  }
}
```

### Manual Monitoring Triggers

```bash
# Monitor ALL sources (social media + weather + news)
curl -X POST http://localhost:3001/api/social-media/monitor \
  -H "Content-Type: application/json" \
  -d '{"platform": "all"}'

# Monitor specific source
curl -X POST http://localhost:3001/api/social-media/monitor \
  -H "Content-Type: application/json" \
  -d '{"platform": "twitter"}'

# Options: twitter, facebook, youtube, weather, news, all
  -H "Content-Type: application/json" \
  -d '{"platform": "twitter"}'
```

## Rate Limiting

Each social media API has rate limits:

- **Twitter**: 300 requests per 15 minutes (with Bearer Token)
- **Facebook**: Varies by endpoint and permission level
- **YouTube**: 10,000 units per day (default quota)

The services include built-in rate limiting and error handling.

## Error Handling

All services include error handling and will continue to work even if:
- API keys are not configured
- API requests fail
- Rate limits are exceeded

The application will log errors but continue running.

## Project Structure

```
backend/
├── server.js                 # Main server file
├── services/
│   ├── twitterService.js    # Twitter API integration
│   ├── facebookService.js   # Facebook API integration
│   ├── youtubeService.js    # YouTube API integration
│   └── socialMediaMonitor.js # Monitoring service
├── package.json
└── .env                      # Environment variables
```

## Deployment

### Render

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Set build command: `npm install`
4. Set start command: `npm start`

### Other Platforms

The server can be deployed to any Node.js hosting platform (Heroku, AWS, etc.). Make sure to:
- Set all environment variables
- Configure CORS if needed
- Set up proper logging
- Monitor API usage and costs

## License

Developed for INCOIS under the Ministry of Earth Sciences, Government of India.

