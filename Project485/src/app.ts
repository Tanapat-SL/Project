import './utils/async-errors';
import express from 'express';
import cors from 'cors';
import { env, isProduction } from './config/env';
import { logger } from './middlewares/logger';
import { createRateLimiter } from './middlewares/rate-limit';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import authRoutes from './routes/auth.route';
import usersRoutes from './routes/users.route';
import chatRoutes from './routes/chat.route';
import gamesRoutes from './routes/games.route';
import partiesRoutes from './routes/parties.route';
import aiRoutes from './routes/ai.route';
import safetyRoutes from './routes/safety.route';
import friendsRoutes from './routes/friends.route';

const app = express();

// หลัง reverse proxy (production) ต้องให้ req.ip เป็น IP จริงของผู้ใช้
if (isProduction) app.set('trust proxy', 1);

app.use(logger);
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json({ limit: '100kb' }));

// Rate limit: ทั่วไป / เริ่มล็อกอิน (กัน brute force) / ส่งข้อความแชท (กัน spam)
app.use('/api', createRateLimiter({ windowMs: 60_000, max: 600, keyPrefix: 'api' }));
app.use('/api/auth/discord', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'auth' }));
app.post('/api/chat/*', createRateLimiter({ windowMs: 10_000, max: 15, keyPrefix: 'chat-send' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/parties', partiesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api', safetyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
