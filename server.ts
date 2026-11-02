import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API endpoint for AI Loot Generation
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3.8-flash', temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório.' });
    }

    if (!aiClient) {
      // Recheck if process.env.GEMINI_API_KEY has become available
      if (process.env.GEMINI_API_KEY) {
        aiClient = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } else {
        return res.status(503).json({
          error: 'GEMINI_API_KEY não configurada no servidor. Ativando fallback procedural.',
        });
      }
    }

    let text = '';
    try {
      const response = await aiClient.models.generateContent({
        model: model || 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: Number(temperature) || 0.7,
          responseMimeType: 'application/json',
        },
      });
      text = response.text || '';
    } catch (primaryErr: any) {
      if (primaryErr?.message?.includes('503') || primaryErr?.status === 503) {
        console.warn('503 on primary model, attempting gemini-3.1-flash-lite...');
        const retryRes = await aiClient.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            temperature: Number(temperature) || 0.7,
            responseMimeType: 'application/json',
          },
        });
        text = retryRes.text || '';
      } else {
        throw primaryErr;
      }
    }

    return res.json({ text });
  } catch (error: any) {
    console.error('Erro na chamada da API Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao processar solicitação com Gemini.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RollDeck server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
