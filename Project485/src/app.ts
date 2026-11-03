import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.route';
import usersRoutes from './routes/users.route';
import chatRoutes from './routes/chat.route';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chat', chatRoutes);

export default app;