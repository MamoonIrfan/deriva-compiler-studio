import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client utility on the server with 'aistudio-build' User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function extractErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  if (typeof error.message === 'string') {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      // not JSON string
    }
    return error.message;
  }
  return String(error);
}

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      model = 'gemini-3.5-flash',
      systemInstruction = 'You are a helpful compiler engineering assistant.',
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please attach an API key in AI Studio Secrets.',
      });
    }

    // Format multi-turn history for Gemini
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const item of history) {
      if (item && item.text && (item.role === 'user' || item.role === 'model')) {
        contents.push({
          role: item.role,
          parts: [{ text: item.text }],
        });
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let response;
    let modelUsed = model;

    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });
    } catch (primaryError: any) {
      const errMsg = extractErrorMessage(primaryError);
      const isTransientDemand =
        errMsg.includes('503') ||
        errMsg.toLowerCase().includes('high demand') ||
        errMsg.toLowerCase().includes('unavailable');

      // If the selected model experiences temporary high demand, fallback gracefully
      if (isTransientDemand && model !== 'gemini-3.8-flash') {
        console.warn(`Model ${model} high demand (503). Retrying with gemini-3.8-flash...`);
        try {
          modelUsed = 'gemini-3.8-flash';
          response = await ai.models.generateContent({
            model: modelUsed,
            contents,
            config: {
              systemInstruction,
            },
          });
        } catch {
          // If fallback fails too, rethrow original error
          throw primaryError;
        }
      } else {
        throw primaryError;
      }
    }

    const text = response?.text || '';

    return res.json({
      text,
      model: modelUsed,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: extractErrorMessage(error),
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaCompiler Studio server running on port ${PORT}`);
  });
}

startServer();
