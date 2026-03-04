import OpenAI from 'openai';
import logger from '../helpers/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    logger.warn('[OpenAI Config] OPENAI_API_KEY environment variable is not set');
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

