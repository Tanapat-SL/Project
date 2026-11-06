import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { isAdminUser } from './admin.middleware';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    const userId = Number((decoded as any).userId);
    if (!Number.isInteger(userId) || userId < 1) return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isBanned: true, banReason: true } });
    if (!user) return res.status(401).json({ message: 'Unauthorized: Account not found' });
    (req as any).user = { ...(decoded as object), userId };

    const path = req.originalUrl.split('?')[0];
    const allowedWhileBanned =
      (req.method === 'GET' && path === '/api/auth/me') ||
      (req.method === 'POST' && path === '/api/appeals') ||
      (req.method === 'GET' && path === '/api/appeals/mine');
    if (user.isBanned && !allowedWhileBanned && !(await isAdminUser(userId))) {
      return res.status(403).json({ code: 'ACCOUNT_BANNED', message: user.banReason || 'บัญชีถูกระงับการใช้งาน', bannedAt: true });
    }
    next();
  } catch (error) {
    if (error instanceof Error && error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') return next(error);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
