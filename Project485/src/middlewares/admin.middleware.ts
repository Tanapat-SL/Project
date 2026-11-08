import { prisma } from '../lib/prisma';
import { env } from '../config/env';

const adminDiscordIds = new Set(
  env.ADMIN_DISCORD_IDS.split(',').map(value => value.trim()).filter(Boolean),
);

export async function isAdminUser(userId: number) {
  if (!adminDiscordIds.size) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  return Boolean(user && adminDiscordIds.has(user.discordId));
}

export async function requireAdmin(req: any, res: any, next: any) {
  try {
    const userId = Number(req.user?.userId);
    if (!Number.isInteger(userId) || !(await isAdminUser(userId))) {
      return res.status(403).json({ message: 'Administrator access required' });
    }
    next();
  } catch (error) {
    next(error);
  }
}
