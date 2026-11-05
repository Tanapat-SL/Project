import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route';
import usersRoutes from './routes/users.route';
import chatRoutes from './routes/chat.route';
import gamesRoutes from './routes/games.route';
import partiesRoutes from './routes/parties.route';
import aiRoutes from './routes/ai.route';
import safetyRoutes from './routes/safety.route';
import friendsRoutes from './routes/friends.route';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/parties', partiesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api', safetyRoutes);

export default app;