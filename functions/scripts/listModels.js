const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../.env' }); // Adjust path if running from scripts dir

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found in environment');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Note: ListModels might not be directly exposed on the helper but let's try via simple REST or check SDK
        // SDK doesn't always have listModels helper on the main class easily accessible in all versions.
        // We can use a direct fetch to the API.

        console.log('Fetching available models...');
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name} (Ver: ${m.version})`);
                }
            });
        } else {
            console.log('Unexpected response:', data);
        }

    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
