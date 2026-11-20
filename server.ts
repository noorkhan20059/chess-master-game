import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractReadableError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; status?: string } };
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // not JSON
  }
  return raw;
}

async function generateCoachText(prompt: string, systemInstruction: string): Promise<string> {
  const ai = getGeminiClient();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
        },
      });
      return response.text?.trim() ?? '';
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : '';
      const transient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
      if (!transient || attempt === 1) break;
      await new Promise((r) => setTimeout(r, 750));
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY) });
  });

  app.post('/api/chess-coach', async (req, res) => {
    try {
      const {
        fen,
        pgn,
        bestMoveSan,
        altMoveSan,
        evalText,
        tacticalAlert,
        checkmateThreat,
        difficulty,
        question,
      } = req.body ?? {};

      if (!fen) {
        res.status(400).json({ error: 'Position FEN is required.' });
        return;
      }

      const prompt = [
        `Current FEN: ${fen}`,
        pgn ? `Moves so far (PGN): ${pgn}` : 'Starting position.',
        bestMoveSan ? `Stockfish top move: ${bestMoveSan}` : '',
        altMoveSan ? `Alternative move: ${altMoveSan}` : '',
        evalText ? `Engine evaluation (White perspective): ${evalText}` : '',
        tacticalAlert ? `Tactical note: ${tacticalAlert}` : '',
        checkmateThreat ? `Mate threat: ${checkmateThreat}` : '',
        difficulty ? `Opponent tier: ${difficulty}` : '',
        question
          ? `Player question: ${question}`
          : 'Explain clearly why the recommended move is strong and what strategic plan follows next.',
      ]
        .filter(Boolean)
        .join('\n');

      const advice = await generateCoachText(
        prompt,
        'You are a concise Grandmaster Chess Coach inside AI Chess Master. Give practical, accurate advice grounded strictly in the provided FEN, moves, and Stockfish evaluation. Keep answers to 2-3 crisp sentences with concrete squares and plans. Do not invent illegal moves.'
      );

      res.json({ advice });
    } catch (err) {
      const message = extractReadableError(err);
      const status = message.includes('GEMINI_API_KEY') ? 500 : 502;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/match-summary', async (req, res) => {
    try {
      const { pgn, whiteAccuracy, blackAccuracy, counts, resultReason } = req.body ?? {};
      if (!pgn) {
        res.status(400).json({ error: 'PGN is required for match summary.' });
        return;
      }

      const prompt = [
        `Result: ${resultReason ?? 'Completed'}`,
        `White Accuracy: ${whiteAccuracy ?? 0}%, Black Accuracy: ${blackAccuracy ?? 0}%`,
        `Move counts: ${JSON.stringify(counts ?? {})}`,
        `PGN: ${pgn}`,
        'Provide a concise 3-sentence post-game coaching takeaway highlighting key turning points and one concrete habit to practice next.',
      ].join('\n');

      const summary = await generateCoachText(
        prompt,
        'You are a Grandmaster Chess Analyst. Deliver a sharp, encouraging, actionable 3-sentence coaching summary based on the provided PGN and accuracy metrics.'
      );

      res.json({ summary });
    } catch (err) {
      const message = extractReadableError(err);
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Chess Master server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
