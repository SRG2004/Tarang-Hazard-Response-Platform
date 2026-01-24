const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
// Note: We use process.env.GEMINI_API_KEY which should be set in environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

// System prompt to give the AI context about Tarang
const SYSTEM_PROMPT = `
You are "Tarang Bot", an intelligent assistant for the Tarang Disaster Management Platform powered by INCOIS.
Your goal is to help users (citizens, fishermen, officials) with disaster preparedness, reporting hazards, and using the app.

Key Features of Tarang App:
1. **Report Hazard**: Users can report tsunamis, floods, storm surges, etc.
2. **Fisherman Management**: Safe fishing zones, circulars, and alerts for fishermen.
3. **Maps**: Interactive hazard maps showing safe and dangerous zones.
4. **Emergency Contacts**: List of helplines and authorities.
5. **Volunteer**: Users can register as volunteers.
6. **Donations**: Users can donate to relief funds.
7. **Hazard Drills**: Information about safety drills.

Guidelines:
- Be helpful, calm, and concise.
- If a user asks about an immediate emergency (e.g., "I see a tsunami"), tell them to evacuate immediately and call 112 or local authorities. Do not just chat.
- If asked about app features, guide them to the relevant section (e.g., "You can report this in the 'Report Hazard' section").
- If asked about weather, say you don't have real-time access yet but they should check the IMD website or app dashboard.
- Keep responses short (under 3-4 sentences) unless a detailed explanation is asked for.
- Support English, Hindi, and other Indian languages if asked (you can reply in the same language as the user).

Current Date: ${new Date().toDateString()}
`;

router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            console.warn('GEMINI_API_KEY not set. Using mock response.');
            return res.json({
                success: true,
                response: "I'm currently in demo mode (API Key missing). But I can tell you that Tarang helps you stay safe during disasters! Please configure the backend with a valid Gemini API Key."
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: history ? history.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            })) : [],
            generationConfig: {
                maxOutputTokens: 200,
            },
        });

        // Send the system prompt context first if it's a new chat, 
        // but Gemini API handles system instructions differently or via the first message.
        // For simplicity in this "gemini-pro" version, we'll prepend context to the message 
        // if history is empty, or rely on the persona being consistent.
        // A better approach for "gemini-1.5-pro" is using the systemInstruction parameter, 
        // but for "gemini-pro" we often just prepend context.

        let finalMessage = message;
        if (!history || history.length === 0) {
            finalMessage = `${SYSTEM_PROMPT}\n\nUser: ${message}`;
        }

        const result = await chat.sendMessage(finalMessage);
        const response = await result.response;
        const text = response.text();

        res.json({ success: true, response: text });

    } catch (error) {
        console.error('Error in AI chat:', error);

        // Check for specific Gemini errors
        let errorMessage = "I'm having trouble connecting to my brain right now. Please try again later.";

        if (error.message && error.message.includes('API key not valid')) {
            errorMessage = "My AI connection is not configured correctly (Invalid API Key). Please contact the administrator.";
        } else if (error.message && error.message.includes('quota')) {
            errorMessage = "I'm a bit overwhelmed right now (Quota Exceeded). Please try again in a few minutes.";
        }

        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.FUNCTIONS_EMULATOR ? error.stack : undefined,
            response: errorMessage
        });
    }
});

module.exports = router;
