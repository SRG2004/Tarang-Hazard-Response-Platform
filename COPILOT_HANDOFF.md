# Tarang Hazard Response Platform — Full Handoff Context

## Project Overview
**Tarang** is an ocean hazard reporting and monitoring platform for INCOIS (Indian National Centre for Ocean Information Services). It has:
- **Frontend**: React + TypeScript + Vite + Tailwind, deployed to **Vercel** at `https://tarang-frontend-system.vercel.app/`
- **Backend**: Node.js + Express, deployed to **Vercel** at `https://tarang-backend-system.vercel.app/api/`
- **Database**: Firebase Firestore (Spark/free plan — user does NOT want to upgrade to Blaze)
- **AI**: Google Gemini `gemini-3.6-flash` for image/text hazard analysis
- **OSINT**: RSS aggregation from GDACS, Sachet/NDMA, GNews, Google Trends

## Directory Structure

```
Tarang-Hazard-Response-Platform/
├── backend/                          # Express API (deployed to Vercel)
│   ├── server.js                     # Entry point — STILL 1,479 lines, 35 inline routes
│   ├── server_extensions.js          # Minor extensions
│   ├── controllers/
│   │   ├── alertController.js        # Flash SMS controller
│   │   └── authController.js         # Auth controller
│   ├── routes/
│   │   ├── adminRoutes.js            # Seed defaults (fat route, has inline logic)
│   │   ├── aiContextRoutes.js        # AI chat/analysis (fat route)
│   │   ├── aiRoutes.js               # AI training (fat route, NOT mounted)
│   │   ├── alertRoutes.js            # Flash SMS (thin, delegates to controller ✓)
│   │   ├── authRoutes.js             # Auth (thin, delegates to controller ✓)
│   │   ├── exportRoutes.js           # Data exports (fat route)
│   │   ├── flashAlertRoutes.js       # Flash alerts (fat route, NOT mounted)
│   │   ├── osintRoutes.js            # OSINT scanning (fat route)
│   │   ├── reportRoutes.js           # Reports CRUD (extracted, delegates to service ✓)
│   │   └── weatherRoutes.js          # Weather (fat route, NOT mounted)
│   ├── services/                     # 19 service files (business logic layer)
│   │   ├── reportAnalysisService.js  # ✓ Extracted from server.js
│   │   ├── geminiService.js          # AI analysis
│   │   ├── osintAggregator.js        # OSINT pipeline
│   │   ├── gdacsService.js           # GDACS disaster alerts
│   │   ├── sachetService.js          # Indian NDMA/Sachet alerts
│   │   ├── weatherService.js         # Weather data (29KB!)
│   │   ├── modelTrainingService.js   # ML model training (34KB!)
│   │   └── ... (12 more)
│   └── vercel.json
├── src/                              # React frontend
│   ├── App.tsx                       # Main router — 413 lines, all routes defined here
│   ├── config/rbac.ts                # Role-based access control config
│   ├── pages/                        # 28 page components
│   │   ├── ReportsManagement.tsx     # 33KB — needs componentization
│   │   ├── ReportHazardNew.tsx       # 30KB — multi-step wizard, needs splitting
│   │   ├── FieldTeams.tsx            # 22KB — has embedded Leaflet map
│   │   ├── CitizenDashboardNew.tsx   # 19KB
│   │   └── ... (24 more pages)
│   ├── components/                   # Shared components + sub-directories
│   ├── services/
│   │   └── apiService.ts             # 2,337 lines — all frontend API calls
│   ├── contexts/                     # AuthContext, TranslationContext
│   ├── hooks/                        # Custom hooks
│   └── types/                        # TypeScript type definitions
├── vercel.json                       # Frontend Vercel config
├── firebase.json                     # Firebase config
├── firestore.rules                   # Firestore security rules
└── storage.rules                     # Firebase Storage rules
```

---

## What Was Already Done

### 1. AI Model Fix
- Migrated from deprecated `gemini-2.5-flash` to `gemini-3.6-flash` in `backend/services/geminiService.js`

### 2. OSINT Pipeline Improvements
- Added `backend/services/sachetService.js` (Indian NDMA/IMD disaster alerts)
- Added `backend/services/gdacsService.js` (Global Disaster Alert and Coordination System)
- Integrated both into `osintAggregator.js` with `Promise.all` for parallel fetching
- Removed YouTube scrapers (user wanted text-only sources for fast processing)

### 3. Frontend API Fix
- Fixed `SocialMediaVerification.tsx` — was calling non-existent `apiService.getSocialMediaPosts()`
- Remapped to `apiService.getSocialMediaReports()` which hits `/osint/alerts`
- Exported missing functions from `apiService.ts`

### 4. Code Cleanup (Already Done)
- **Deleted `/functions/` directory** — was an entire duplicate of `/backend/` (10,489 lines removed)
- **Extracted `reportRoutes.js`** — moved report CRUD endpoints out of `server.js`
- **Extracted `reportAnalysisService.js`** — moved AI analysis logic out of `server.js`
- Mounted `reportRoutes` in `server.js` at line 189

### 5. Security Audit
- `npm audit` run on both frontend and backend
- Backend has `nodemailer` (high severity) and `uuid` (moderate) vulnerabilities
- Frontend has 59 vulnerabilities (react-router, rollup, vite, tar, websocket-driver)
- Can't auto-fix backend because no `package-lock.json` was generated (`.npmrc` has `legacy-peer-deps=true`)

---

## UI Bugs Found (Documented, NOT Fixed Yet)

### Bug 1: Sidebar Overlap (GLOBAL — affects ALL pages)
**Every** page with the sidebar expanded has the left sidebar overlapping the main content area. The sidebar is rendered in `App.tsx` `DashboardLayout` component (line 227-329). The sidebar div uses `hidden lg:block relative z-20` but the main content `flex-1` div doesn't have a left margin/padding to account for the sidebar width.

**Files to fix**: `src/App.tsx` (DashboardLayout component, lines 227-329) and/or `src/components/Sidebar.tsx`

### Bug 2: Logout is Completely Broken
Both the header logout button and sidebar logout button do NOT clear the session. The `handleLogout` function at `App.tsx:130` calls `authLogout()` and then `navigate('/')`, but the Firebase auth state is not being cleared in the browser.

**Files to investigate**: `src/contexts/AuthContext.tsx`, `src/App.tsx:130-137`

### Bug 3: Missing Dashboard Routes (404 on direct navigation)
`/authority-dashboard`, `/management-dashboard`, `/citizen-dashboard` all show "Page Not Found". This is by design — `App.tsx` uses a single `/dashboard` route that renders different components based on user role via `DashboardComponent()` at line 215. The dashboard-specific routes simply don't exist. If you want them, add them to `App.tsx` routes (lines 285-325).

### Bug 4: Backend API Failures (users/volunteers endpoints)
Console errors on every page load:
- `Error fetching users: Mt` → the `/api/users` endpoint exists (server.js line 417) but may be failing due to Firestore permissions or missing data
- `Error fetching volunteers: Mt` → the `/api/volunteers` endpoint exists (server.js line 305) but likely has the same issue

### Bug 5: "Invalid Date" in Reports
On `/reports`, the contextual AI analysis shows "Invalid Date" for past events. The date formatting issue is in `ReportsManagement.tsx` where it tries to parse `createdAt` timestamps from Firestore (which can be Firestore Timestamp objects, ISO strings, or null).

### Bug 6: RBAC Blocking Authority from Key Pages
The `authority` role in `src/config/rbac.ts` (line 29-48) does NOT include:
- `/report-hazard` — Only citizens can report hazards
- `/impact-reporting` — Only NGOs and responders can submit impact reports
- `/field-teams` — Only NGOs can manage field teams
- `/field-verification` — Only responders can do field verification

This may be intentional design, or a bug depending on requirements.

### Bug 7: Emergency Dispatch "Respond" Button Broken
Clicking "Respond" on `/emergency-dispatch` throws: `FirebaseError: Function updateDoc() called with invalid data. Unsupported field value: undefined (found in field responderId)`. The `responderId` is not being set correctly when the user claims an incident.

**File to fix**: `src/pages/EmergencyDispatch.tsx`

### Bug 8: Resource Requests Fetch Failure
Switching to "Resource Requests" tab in `/resource-management` throws `Error fetching resource requests: Mt`.

### Pages NOT Tested Yet (ran out of API quota)
These 6 pages still need testing:
- `/social-media-verification`
- `/social-media` (LiveIntelligence)
- `/insights` (DataInsights)
- `/data-exports` (DataExports)
- `/map-view` (MapView)
- `/hazard-drills` (HazardDrills)

And these Auth/Admin pages:
- `/settings`
- `/user-management`
- `/volunteer-registration`
- `/volunteers`
- `/donate`
- `/emergency-contacts`
- `/infrastructure`
- `/field-verifications`

---

## Remaining Work: MVC Refactoring Plan

### Goal
Transform `server.js` from a monolithic 1,479-line file with 35 inline routes into a clean MVC architecture.

### Step 1: Extract Controllers from server.js
`server.js` still has **35 inline route handlers** that need to be extracted. Here's the mapping:

| Lines in server.js | New Route File | New Controller File |
|---|---|---|
| 192-301 (status) | `routes/statusRoutes.js` | `controllers/statusController.js` |
| 305-360 (volunteers) | `routes/volunteerRoutes.js` | `controllers/volunteerController.js` |
| 362-696 (users) | `routes/userRoutes.js` | `controllers/userController.js` |
| 697-771 (drills) | `routes/drillRoutes.js` | `controllers/drillController.js` |
| 773-809 (impact-reports) | `routes/impactReportRoutes.js` | `controllers/impactReportController.js` |
| 811-895 (resource-requests) | `routes/resourceRequestRoutes.js` | `controllers/resourceRequestController.js` |
| 898-972 (contacts) | `routes/contactRoutes.js` | `controllers/contactController.js` |
| 974-1051 (infrastructure) | `routes/infrastructureRoutes.js` | `controllers/infrastructureController.js` |
| 1053-1127 (donations) | `routes/donationRoutes.js` | `controllers/donationController.js` |
| 1128-1345 (analytics) | `routes/analyticsRoutes.js` | `controllers/analyticsController.js` |
| 1347-1479 (analyze-report) | Already in `reportRoutes.js` | Already in `reportAnalysisService.js` |

### Step 2: Pattern for Each Controller
```javascript
// controllers/volunteerController.js
const admin = require('firebase-admin');
const db = admin.firestore();

exports.getVolunteers = async (req, res) => {
  try {
    const { status, role } = req.query;
    let query = db.collection('volunteers');
    if (status) query = query.where('status', '==', status);
    if (role) query = query.where('role', '==', role);
    const snapshot = await query.get();
    const volunteers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, volunteers });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ success: false, error: error.message, volunteers: [] });
  }
};

exports.registerVolunteer = async (req, res) => { /* ... */ };
exports.updateVolunteerStatus = async (req, res) => { /* ... */ };
```

```javascript
// routes/volunteerRoutes.js
const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');

router.get('/', volunteerController.getVolunteers);
router.post('/register', volunteerController.registerVolunteer);
router.patch('/:id/status', volunteerController.updateVolunteerStatus);

module.exports = router;
```

### Step 3: Mount in server.js
After extraction, `server.js` should look like:
```javascript
// server.js — should be ~100-150 lines max
app.use('/auth', authRoutes);
app.use('/admin', verifyAuth, adminRoutes);
app.use('/export', verifyAuth, exportRoutes);
app.use('/alerts', verifyAuth, alertRoutes);
app.use('/ai', aiRoutes);
app.use('/osint', verifyAuth, osintRoutes);
app.use('/reports', verifyAuth, reportRoutes);
app.use('/volunteers', volunteerRoutes);          // NEW
app.use('/users', verifyAuth, userRoutes);         // NEW
app.use('/drills', drillRoutes);                   // NEW
app.use('/impact-reports', verifyAuth, impactReportRoutes);  // NEW
app.use('/resource-requests', verifyAuth, resourceRequestRoutes); // NEW
app.use('/contacts', contactRoutes);               // NEW
app.use('/infrastructure', infrastructureRoutes);  // NEW
app.use('/donations', donationRoutes);             // NEW
app.use('/analytics', verifyAuth, analyticsRoutes); // NEW
app.use('/status', verifyAuth, statusRoutes);      // NEW
```

### Step 4: Also Extract Fat Route Files
These existing route files have inline business logic that should move to controllers:
- `adminRoutes.js` (170 lines) → `adminController.js`
- `aiContextRoutes.js` (6.6KB) → `aiContextController.js`
- `exportRoutes.js` (4.1KB) → `exportController.js`
- `osintRoutes.js` (2.7KB) → `osintController.js`

### Step 5: Dead/Unmounted Route Files to Clean Up
These route files exist but are **NOT mounted** in `server.js`:
- `routes/aiRoutes.js` — appears to be an older version of `aiContextRoutes.js`
- `routes/flashAlertRoutes.js` — duplicate of alert functionality
- `routes/weatherRoutes.js` — weather endpoints not used

Decision: Delete them or mount them if needed.

---

## Remaining Work: Frontend Componentization

### Large Files to Break Down
1. **`ReportsManagement.tsx` (33KB)** → Extract: `ReportCard`, `ReportFilters`, `ReportDetailsModal`, `AIAnalysisPanel`
2. **`ReportHazardNew.tsx` (30KB)** → Extract: `LocationStep`, `MediaUploadStep`, `HazardDetailsStep`, `ReviewStep`
3. **`FieldTeams.tsx` (22KB)** → Extract: `TeamMap`, `TeamList`, `TeamMemberCard`
4. **`apiService.ts` (2,337 lines)** → Consider splitting by domain: `reportApi.ts`, `userApi.ts`, `osintApi.ts`, etc.

---

## Key Files Reference

| Purpose | Path |
|---|---|
| Frontend entry/router | `src/App.tsx` |
| RBAC config | `src/config/rbac.ts` |
| All API calls | `src/services/apiService.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Sidebar component | `src/components/Sidebar.tsx` |
| Header component | `src/components/Header.tsx` |
| Backend entry | `backend/server.js` |
| AI service | `backend/services/geminiService.js` |
| OSINT aggregator | `backend/services/osintAggregator.js` |
| Report analysis | `backend/services/reportAnalysisService.js` |
| Firebase config | `firebase.json`, `firestore.rules`, `storage.rules` |
| Vercel (frontend) | `vercel.json` |
| Vercel (backend) | `backend/vercel.json` |

## Deployment
- **Frontend**: Auto-deploys from `main` branch to Vercel (`tarang-frontend-system.vercel.app`)
- **Backend**: Auto-deploys from `main` branch to Vercel (`tarang-backend-system.vercel.app`)
- Push to `main` triggers both deployments automatically

## User Preferences
- Does NOT want to upgrade Firebase to Blaze plan (no billing)
- Prefers text-based OSINT sources (no YouTube/video scraping)
- Wants all testing documented first, then fixes applied one by one
- Wants MVC + microservice architecture for the backend
