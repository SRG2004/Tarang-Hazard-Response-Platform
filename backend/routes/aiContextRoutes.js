const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

// Helper to fetch real-time context from Firestore
async function getContextData() {
    try {
        const db = admin.firestore();
        const context = {
            reports: [],
            stats: {
                activeVolunteers: 0,
                pendingReports: 0
            }
        };

        // 1. Fetch recent high-severity reports (Last 24 hours or just recent 5)
        const reportsSnap = await db.collection('reports')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        context.reports = reportsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                type: data.type || 'Hazard',
                location: data.location || 'Unknown',
                severity: data.severity || 'Medium',
                description: data.description || 'No description',
                status: data.status || 'pending',
                time: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : 'Just now'
            };
        });

        // 2. Fetch Volunteer Stats (Approximation)
        const volSnap = await db.collection('volunteers').where('status', '==', 'active').count().get();
        context.stats.activeVolunteers = volSnap.data().count;

        return context;
    } catch (error) {
        console.error('Error fetching context:', error);
        return null; // Fail gracefully, chatbot works without context if db fails
    }
}

const SYSTEM_PROMPT_TEMPLATE = (context) => `
You are "Tarang Bot", the official AI assistant for the Tarang Disaster Management Platform (INCOIS).

**Your Identity:**
- Helpful, calm, and authoritative on safety.
- You have access to REAL-TIME data about hazards.

**Current Real-Time Context (Live Database):**
${context ? JSON.stringify(context, null, 2) : 'No active hazards reported right now.'}

**Guidelines:**
1. **Use the Data**: If a user asks "Are there any floods?", LOOK at the "reports" list above. If you see one, say "Yes, there is a reported flood in [Location] (Severity: [High/Low])."
2. **Don't Hallucinate**: If the context list is empty, say "I don't show any active reports in the system right now."
3. **Emergency Priority**: If the user is in danger, ignore the data and give emergency contacts immediately (112, 1070).
4. **Brevity**: Keep answers under 3-4 sentences.

**Key Contacts:**
- National Emergency: 112
- Disaster Helpline: 1070
- Coastal Guard: 1554
`;

router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.json({
                success: true,
                response: "⚠️ API Key Missing. I am running in demo mode."
            });
        }

        // 1. Fetch Context (RAG)
        const contextData = await getContextData();
        const systemPrompt = SYSTEM_PROMPT_TEMPLATE(contextData);

        // 2. Prepare Chat History (Common for all models)
        // Filter out any messages without text or invalid roles
        const chatHistory = history ? history
            .filter(msg => msg.text && (msg.sender === 'user' || msg.sender === 'bot'))
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            })) : [];

        // 3. Model Fallback Chains
        // Prioritize 2.0-flash (Smartest/Fastest), then 1.5-flash (Standard), then Pro (Stable/Legacy)
        const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
        let lastError = null;

        for (const modelName of MODELS) {
            try {
                // console.log(`Attempting to generate with model: ${modelName}`); // Optional debug
                const model = genAI.getGenerativeModel({ model: modelName });

                const chat = model.startChat({
                    history: chatHistory,
                    generationConfig: {
                        maxOutputTokens: 300,
                        temperature: 0.4,
                    },
                });

                const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}`;

                // Retry Mechanism specifically for Rate Limits (429)
                let text;
                const maxRetries = 3;
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        const result = await chat.sendMessage(fullPrompt);
                        const response = await result.response;
                        text = response.text();
                        break; // Success
                    } catch (err) {
                        const isRateLimit = err.message.includes('429') || err.message.includes('Resource exhausted');
                        if (isRateLimit && attempt < maxRetries) {
                            const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                            console.warn(`Model ${modelName} hit 429. Retrying in ${delay}ms...`);
                            await new Promise(r => setTimeout(r, delay));
                        } else {
                            throw err; // Re-throw to model loop (to try next model or fail)
                        }
                    }
                }

                // If we get here, we have text. Return it.
                return res.json({ success: true, response: text, modelUsed: modelName });

            } catch (error) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model in the list
            }
        }

        // 4. All Models Failed
        throw lastError || new Error("All AI models failed to respond.");

    } catch (error) {
        console.error('Error in RAG Chat (All Fallbacks Failed):', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            response: `System Error: ${error.message}. (Please check server logs)`
        });
    }
});

module.exports = router;
