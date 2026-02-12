import OpenAI from 'openai';

const PROVIDERS = {
  deepseek: [
    { key: process.env.VITE_DEEPSEEK_1, baseURL: 'https://api.deepseek.com' },
    { key: process.env.VITE_DEEPSEEK_2, baseURL: 'https://api.deepseek.com' }
  ],
  groq: [
    { key: process.env.VITE_GROQ_1, baseURL: 'https://api.groq.com/openai/v1' },
    { key: process.env.VITE_GROQ_2, baseURL: 'https://api.groq.com/openai/v1' },
    { key: process.env.VITE_GROQ_3, baseURL: 'https://api.groq.com/openai/v1' },
    { key: process.env.VITE_GROQ_4, baseURL: 'https://api.groq.com/openai/v1' }
  ],
  openrouter: [
    { key: process.env.VITE_OPENROUTER_1, baseURL: 'https://openrouter.ai/api/v1' },
    { key: process.env.VITE_OPENROUTER_2, baseURL: 'https://openrouter.ai/api/v1' },
    { key: process.env.VITE_OPENROUTER_3, baseURL: 'https://openrouter.ai/api/v1' }
  ],
  openai: [
    { key: process.env.VITE_OPENAI_1 },
    { key: process.env.VITE_OPENAI_2 },
    { key: process.env.VITE_OPENAI_3 }
  ]
};

let currentProviderIndex = 0;
const allKeys = Object.values(PROVIDERS).flat();

function getNextProvider() {
  const provider = allKeys[currentProviderIndex];
  currentProviderIndex = (currentProviderIndex + 1) % allKeys.length;
  return provider;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { messages } = req.body;

  const provider = getNextProvider();
  const client = new OpenAI({
    apiKey: provider.key,
    baseURL: provider.baseURL,
    dangerouslyAllowBrowser: false
  });

  try {
    const stream = await client.chat.completions.create({
      model: provider.baseURL?.includes('groq') ? 'llama-3.3-70b-versatile' :
             provider.baseURL?.includes('deepseek') ? 'deepseek-chat' :
             provider.baseURL?.includes('openrouter') ? 'meta-llama/llama-3.1-8b-instruct:free' :
             'gpt-4o-mini',
      messages: messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4000
    });

    let buffer = '';
    const targetCharsPerSecond = 2500;
    const chunkSize = Math.ceil(targetCharsPerSecond / 10);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        buffer += content;
        
        while (buffer.length >= chunkSize) {
          const toSend = buffer.slice(0, chunkSize);
          buffer = buffer.slice(chunkSize);
          res.write(`data: ${JSON.stringify({ content: toSend })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    if (buffer) {
      res.write(`data: ${JSON.stringify({ content: buffer })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
