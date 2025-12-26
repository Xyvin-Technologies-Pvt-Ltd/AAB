import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

// Log warning if API key is missing (but don't expose the key value)
if (!apiKey) {
    console.error('[OpenAI Config] WARNING: OPENAI_API_KEY environment variable is not set');
} else {
    console.log('[OpenAI Config] API key loaded successfully (length:', apiKey.length, ')');
}

const openaiClient = new OpenAI({
    apiKey: apiKey,
});

export const openaiConfig = {
    client: openaiClient,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    isConfigured: !!apiKey,
};

export default openaiClient;

