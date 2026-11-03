"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordConfigured = exports.isProduction = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(5000),
    FRONTEND_URL: zod_1.z.string().url().default('http://localhost:5173'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    DISCORD_CLIENT_ID: zod_1.z.string().default(''),
    DISCORD_CLIENT_SECRET: zod_1.z.string().default(''),
    DISCORD_REDIRECT_URI: zod_1.z.string().url().default('http://localhost:5001/api/auth/discord/callback'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    SESSION_TTL_DAYS: zod_1.z.coerce.number().int().positive().default(7),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    // ไม่พิมพ์ค่าของตัวแปร เพื่อไม่ให้ Secret หลุดลง Log
    console.error('❌ Invalid environment variables:');
    for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
}
exports.env = parsed.data;
exports.isProduction = exports.env.NODE_ENV === 'production';
exports.discordConfigured = Boolean(exports.env.DISCORD_CLIENT_ID && exports.env.DISCORD_CLIENT_SECRET);
