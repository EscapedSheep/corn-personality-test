import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { pickQuestions, generateResult, type Question, type UserAnswer } from '../src/data/questions.js';
import { saveResult, getResult } from './store.js';
import { isConfigured, generatePersonality } from './openai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const origin = process.env.CLIENT_ORIGIN || (dev ? 'http://localhost:5173' : undefined);

const app = express();
if (origin) app.use(cors({ origin }));
app.use(express.json());

// Simple in-memory rate limiter (per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  if (entry.count > max) return true;
  rateLimitMap.set(ip, entry);
  return false;
}
// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000).unref();

// REST endpoints (must be before Vite middleware)
app.get('/api/quiz', (req, res) => {
  const dim = (req.query.dimension as string) || 'order';
  if (!['order', 'sensory', 'social'].includes(dim)) {
    res.status(400).json({ error: 'Invalid dimension' });
    return;
  }
  res.json({ questions: pickQuestions(dim, 5), dimension: dim });
});

app.get('/api/result/:id', async (req, res) => {
  const result = await getResult(req.params.id);
  if (!result) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result);
});

app.post('/api/generate', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Rate limit: 10 requests per minute per IP
  if (rateLimit(ip, 10, 60_000)) {
    res.status(429).json({ error: 'Too many requests. Slow down.' });
    return;
  }

  const { dimension, answers } = req.body as { dimension?: string; answers?: UserAnswer[] };
  if (!dimension || !['order', 'sensory', 'social'].includes(dimension)) {
    res.status(400).json({ error: 'Invalid dimension' });
    return;
  }
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    res.status(400).json({ error: 'No answers' });
    return;
  }

  let result = generateResult(dimension, answers);

  if (isConfigured()) {
    const rawAnswers = answers.map(a => a.answer);
    const ai = await generatePersonality(dimension, rawAnswers);
    if (ai) {
      result = {
        title: (ai.title as string) ?? result.title,
        subtitle: (ai.subtitle as string) ?? result.subtitle,
        description: (ai.description as string) ?? result.description,
        traits: Array.isArray(ai.traits) ? ai.traits : result.traits,
        emoji: (ai.emoji as string) ?? result.emoji,
        dimension,
      };
    }
  }

  const id = uuidv4();
  await saveResult(id, result);
  res.json({ ...result, id });
});

async function start() {
  if (dev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: origin ? { origin } : undefined,
  });

  interface Player {
    name: string;
    answers: string[];
    finished: boolean;
  }

  interface Room {
    dimension: string;
    questions: Question[];
    players: Map<string, Player>;
    results: Map<string, { playerName: string; resultId: string }>;
  }

  const rooms = new Map<string, Room>();

  io.on('connection', (socket) => {
    console.log(`[socket] connected ${socket.id}`);

    socket.on('room:create', ({ roomId, dimension, playerName }) => {
      // Prevent overwriting an existing room
      if (rooms.has(roomId)) {
        socket.emit('error', { message: 'Room code already taken. Try another.' });
        return;
      }
      const questions = pickQuestions(dimension, 5);
      const room: Room = {
        dimension,
        questions,
        players: new Map(),
        results: new Map(),
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      room.players.set(socket.id, { name: playerName, answers: [], finished: false });
      socket.emit('room:created', { roomId, questions, dimension });
      console.log(`[room] ${roomId} created by ${playerName} (${dimension})`);
    });

    socket.on('room:join', ({ roomId, playerName }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      // Prevent duplicate names in the same room
      const nameTaken = [...room.players.values()].some(
        p => p.name.toLowerCase() === playerName.toLowerCase()
      );
      if (nameTaken) {
        socket.emit('error', { message: 'That name is already taken in this room.' });
        return;
      }
      socket.join(roomId);
      room.players.set(socket.id, { name: playerName, answers: [], finished: false });
      socket.emit('room:joined', {
        roomId,
        dimension: room.dimension,
        questions: room.questions,
        players: [...room.players.values()].map(p => p.name),
      });
      socket.to(roomId).emit('player:joined', {
        playerName,
        players: [...room.players.values()].map(p => p.name),
      });
    });

    socket.on('quiz:answer', ({ roomId, questionIndex, option }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      player.answers[questionIndex] = option;
      const answered = player.answers.filter(Boolean).length;
      io.to(roomId).emit('quiz:progress', {
        playerId: socket.id,
        playerName: player.name,
        answered,
        total: room.questions.length,
      });
    });

    socket.on('quiz:finish', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      player.finished = true;
      io.to(roomId).emit('player:finished', { playerName: player.name });
      if ([...room.players.values()].every(p => p.finished)) {
        io.to(roomId).emit('room:all-finished');
      }
    });

    socket.on('result:submit', ({ roomId, resultId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      room.results.set(socket.id, { playerName: player.name, resultId });
      io.to(roomId).emit('result:revealed', { playerName: player.name, resultId });
    });

    socket.on('chat:message', ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      socket.to(roomId).emit('chat:message', { playerName: player.name, message });
    });

    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms) {
        if (!room.players.has(socket.id)) continue;
        const player = room.players.get(socket.id)!;
        room.players.delete(socket.id);
        room.results.delete(socket.id);
        socket.to(roomId).emit('player:left', {
          playerName: player.name,
          players: [...room.players.values()].map(p => p.name),
        });
        if (room.players.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://0.0.0.0:${port} (${dev ? 'dev' : 'prod'})`);
  });
}

start();
