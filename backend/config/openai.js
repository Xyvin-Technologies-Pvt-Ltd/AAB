import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const openaiConfig = {
    client: openaiClient,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
};

export default openaiClient;

