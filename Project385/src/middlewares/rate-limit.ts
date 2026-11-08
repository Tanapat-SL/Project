import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

type Bucket = { count: number; resetAt: number };

/**
 * Rate limiter แบบ in-memory (พอสำหรับ Server เดียว / Development)
 * ถ้า Deploy หลาย instance ควรเปลี่ยนไปใช้ Redis store
 */
export const createRateLimiter = ({ windowMs, max, keyPrefix }: { windowMs: number; max: number; keyPrefix: string }) => {
  const buckets = new Map<string, Bucket>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return next(new AppError('Too many requests, please try again later', 429));
    }
    next();
  };
};

/** Rate limit สำหรับ event ของ Socket.IO */
export const createSocketLimiter = (windowMs: number, max: number) => {
  let count = 0;
  let resetAt = Date.now() + windowMs;
  return () => {
    const now = Date.now();
    if (now >= resetAt) {
      count = 0;
      resetAt = now + windowMs;
    }
    count += 1;
    return count <= max;
  };
};
