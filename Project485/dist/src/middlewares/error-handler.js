"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const app_error_1 = require("../errors/app-error");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err, req, res, _next) => {
    if (err instanceof app_error_1.AppError) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002')
            return res.status(409).json({ message: 'Resource already exists' });
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Resource not found' });
    }
    // ไม่ส่ง Stack Trace กลับไปให้ Client
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(500).json({ message: 'Internal Server Error' });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
};
exports.notFoundHandler = notFoundHandler;
