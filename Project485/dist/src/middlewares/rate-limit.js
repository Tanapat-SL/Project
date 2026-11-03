"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocketLimiter = exports.createRateLimiter = void 0;
const app_error_1 = require("../errors/app-error");
/**
 * Rate limiter แบบ in-memory (พอสำหรับ Server เดียว / Development)
 * ถ้า Deploy หลาย instance ควรเปลี่ยนไปใช้ Redis store
 */
const createRateLimiter = ({ windowMs, max, keyPrefix }) => {
    const buckets = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [key, bucket] of buckets)
            if (bucket.resetAt <= now)
                buckets.delete(key);
    }, windowMs).unref();
    return (req, res, next) => {
        const key = `${keyPrefix}:${req.user?.id ?? req.ip}`;
        const now = Date.now();
        const bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        bucket.count += 1;
        if (bucket.count > max) {
            res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
            return next(new app_error_1.AppError('Too many requests, please try again later', 429));
        }
        next();
    };
};
exports.createRateLimiter = createRateLimiter;
/** Rate limit สำหรับ event ของ Socket.IO */
const createSocketLimiter = (windowMs, max) => {
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
exports.createSocketLimiter = createSocketLimiter;
