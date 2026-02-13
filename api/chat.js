import OpenAI from 'openai';

// Provider configurations - matching original order: DeepSeek, Groq, OpenRouter, OpenAI
const PROVIDERS = {
  // DeepSeek - Smart (2 keys)
  'deepseek-1': {
    key: process.env.VITE_DEEPSEEK_1,
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  },
  'deepseek-2': {
    key: process.env.VITE_DEEPSEEK_2,
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  },
  
  // Groq - Fast & Free (4 keys)
  'groq-1': {
    key: process.env.VITE_GROQ_1,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile'
  },
  'groq-2': {
    key: process.env.VITE_GROQ_2,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile'
  },
  'groq-3': {
    key: process.env.VITE_GROQ_3,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile'
  },
  'groq-4': {
    key: process.env.VITE_GROQ_4,
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile'
  },
  
  // OpenRouter - Variety (3 keys)
  'openrouter-1': {
    key: process.env.VITE_OPENROUTER_1,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.1-8b-instruct:free'
  },
  'openrouter-2': {
    key: process.env.VITE_OPENROUTER_2,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.1-8b-instruct:free'
  },
  'openrouter-3': {
    key: process.env.VITE_OPENROUTER_3,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.1-8b-instruct:free'
  },
  
  // OpenAI - Premium (3 keys)
  'openai-1': {
    key: process.env.VITE_OPENAI_1,
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  },
  'openai-2': {
    key: process.env.VITE_OPENAI_2,
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  },
  'openai-3': {
    key: process.env.VITE_OPENAI_3,
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  }
};

// Auto-rotation for backward compatibility
let currentIndex = 0;
const providerKeys = Object.keys(PROVIDERS);

function getNextProvider() {
  const key = providerKeys[currentIndex];
  currentIndex = (currentIndex + 1) % providerKeys.length;
  return PROVIDERS[key];
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set streaming headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { messages, preferredProvider } = req.body;

  // Use user's preferred provider, or auto-rotate if not specified
  let provider;
  if (preferredProvider && PROVIDERS[preferredProvider]) {
    provider = PROVIDERS[preferredProvider];
  } else {
    provider = getNextProvider();
  }

  // Check if provider has valid API key
  if (!provider.key) {
    res.write(`data: ${JSON.stringify({ error: 'API key not configured for this provider' })}\n\n`);
    return res.end();
  }

  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey: provider.key,
    baseURL: provider.baseURL,
    dangerouslyAllowBrowser: false
  });

  try {
    // Create streaming chat completion
    const stream = await client.chat.completions.create({
      model: provider.model,
      messages: messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4000
    });

    // Stream response with controlled speed (2500 chars/sec)
    let buffer = '';
    const targetCharsPerSecond = 2500;
    const chunkSize = Math.ceil(targetCharsPerSecond / 10);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        buffer += content;
        
        // Send chunks at controlled rate
        while (buffer.length >= chunkSize) {
          const toSend = buffer.slice(0, chunkSize);
          buffer = buffer.slice(chunkSize);
          res.write(`data: ${JSON.stringify({ content: toSend })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Send any remaining buffered content
    if (buffer) {
      res.write(`data: ${JSON.stringify({ content: buffer })}\n\n`);
    }

    // Signal completion
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
