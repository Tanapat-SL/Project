import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

export type SafetyResult = {
  level: 'ALLOW' | 'WARN' | 'BLOCK' | 'REVIEW';
  code: 'TOXIC_CONTENT_BLOCKED' | 'PROFANITY_DETECTED' | null;
  provider: 'openai' | 'local' | 'disabled';
};

const localPatterns = [
  /\b(kill|die|idiot|stupid|moron|trash)\b/i,
  /(ควาย|ด่า|เกลียด|ฆ่าตัวตาย|ให้ตาย)/u,
];

const englishProfanity = /\b(fuck(?:ing|ed|er|ers)?|shit|bitch(?:es)?|asshole|bastard|damn|cunt|dick)\b/i;
const thaiProfanity = /(เหี้ย|เชี่ย|สัส|ไอสัส|อีสัส|ควย|หี|เย็ด|แม่ง|ไอ้เหี้ย|อีเหี้ย|ส้นตีน)/u;

const warningPatterns = [
  /\b(shut up|noob|toxic|loser)\b/i,
  /(โง่|บ้า|เชี่ย)/u,
];

export async function checkContent(content: string): Promise<SafetyResult> {
  const text = content.trim();
  if (!text) return { level: 'ALLOW', code: null, provider: env.OPENAI_API_KEY ? 'openai' : 'disabled' };

  const compactThaiText = text.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}_]+/gu, '');
  if (englishProfanity.test(text) || thaiProfanity.test(compactThaiText)) {
    return { level: 'WARN', code: 'PROFANITY_DETECTED', provider: 'local' };
  }

  if (env.OPENAI_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/moderations',
        { input: text },
        { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, timeout: 5000 },
      );
      const result = response.data?.results?.[0];
      const categories = result?.categories || {};
      const scores = result?.category_scores || {};
      if (result?.flagged && (
        categories.violence ||
        categories.hate ||
        categories.harassment ||
        categories['harassment/threatening'] ||
        categories['hate/threatening'] ||
        scores.violence >= 0.7 ||
        scores.harassment >= 0.7
      )) {
        return { level: 'BLOCK', code: 'TOXIC_CONTENT_BLOCKED', provider: 'openai' };
      }
      if (result?.flagged || Object.values(scores).some((score) => Number(score) >= 0.5)) {
        return { level: 'REVIEW', code: null, provider: 'openai' };
      }
      return { level: 'ALLOW', code: null, provider: 'openai' };
    } catch (error) {
      console.warn('OpenAI moderation unavailable; using local fallback.');
    }
  }

  if (localPatterns.some((pattern) => pattern.test(text))) {
    return { level: 'BLOCK', code: 'TOXIC_CONTENT_BLOCKED', provider: 'local' };
  }
  if (warningPatterns.some((pattern) => pattern.test(text))) {
    return { level: 'WARN', code: null, provider: 'local' };
  }
  return { level: 'ALLOW', code: null, provider: env.OPENAI_API_KEY ? 'local' : 'disabled' };
}

export async function getActiveChatMute(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { chatMutedUntil: true },
  });
  return user?.chatMutedUntil && user.chatMutedUntil > new Date() ? user.chatMutedUntil : null;
}

export async function registerProfanityStrike(userId: number) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { profanityWarnings: { increment: 1 } },
    select: { profanityWarnings: true },
  });

  if (user.profanityWarnings < 3) {
    return { warnings: user.profanityWarnings, mutedUntil: null };
  }

  const mutedUntil = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { profanityWarnings: 0, chatMutedUntil: mutedUntil },
  });
  return { warnings: 3, mutedUntil };
}
