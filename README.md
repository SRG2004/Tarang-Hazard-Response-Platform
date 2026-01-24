# Tarang - Hazard Response Platform

**Ocean Hazard Reporting & Monitoring Platform for INCOIS**

Tarang is a comprehensive disaster management platform designed to facilitate real-time hazard reporting, resource management, and emergency response coordination. It empowers citizens, authorities, NGOs, and responders to collaborate effectively during crises.

## 🚀 Features

- **Hazard Reporting:** Citizens can report incidents (floods, cyclones, etc.) with location and images.
- **AI Verification:** Automated image analysis using Gemini AI to verify reports.
- **Impact Assessment:** Detailed impact reports for damage analysis.
- **Resource Management:** Track and request resources (food, water, medical kits).
- **Emergency Infrastructure:** Manage critical infrastructure (hospitals, shelters).
- **Field Teams:** Deploy and manage response teams on the ground.
- **Live Intelligence:** Real-time OSINT alerts and monitoring.
- **Multi-lingual Support:** English, Hindi, Telugu, Tamil, Malayalam.
- **Notifications:** Real-time alerts for verified incidents and updates.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, TypeScript, TailwindCSS
- **Backend:** Firebase (Functions, Firestore, Auth, Storage, Messaging)
- **AI Integration:** Google Gemini Flash 1.5
- **Mobile:** Capacitor (Android)

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

## ⚙️ Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/SRG2004/Tarang-Hazard-Response-Platform.git
    cd Tarang-Hazard-Response-Platform
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**
    ```bash
    cd functions
    npm install
    cd ..
    ```

## 🔐 Configuration

### 1. Environment Variables
Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 2. Service Account Key (Backend)
For Firebase Admin SDK to work locally or deploy functions correctly:
1.  Go to **Firebase Console > Project Settings > Service Accounts**.
2.  Generate a new private key.
3.  Save the file as `service-account-key.json` inside the `functions/` directory.
    *   *Note: This file is git-ignored for security.*

## 🏃‍♂️ Running Locally

### Start Frontend Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### Start Firebase Emulators (Optional)
To test Cloud Functions and Firestore locally:
```bash
firebase emulators:start
```

## 🚀 Deployment

To deploy the entire application (Frontend + Backend) to Firebase:

```bash
npm run deploy
```

This command builds the frontend (`npm run build`) and deploys hosting, functions, and rules to your Firebase project.

## 📱 Mobile App (Android)

To build and run the Android app using Capacitor:

```bash
npm run android:build
npx cap open android
```
