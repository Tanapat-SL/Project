import { prisma } from '../lib/prisma';

type MessageLike = {
  content: string;
  sender: { id: number; username: string };
};

type NoticeInput = {
  io: any;
  recipientId: number;
  conversationId: number;
  message: MessageLike;
  kind: 'DIRECT' | 'PARTY';
  partyId?: number;
  partyTitle?: string;
  /** คีย์ห้องแชทจากมุมมองของผู้รับ เช่น 'party:5' หรือ 'direct:<senderId>' */
  chatKey: string;
};

/**
 * สร้าง/อัปเดตการแจ้งเตือน NEW_MESSAGE ให้ผู้รับ 1 คน
 * - ถ้ายังมีการแจ้งเตือนที่ยังไม่อ่านของห้องเดิมอยู่ จะอัปเดตอันเดิม (นับจำนวน + เปลี่ยนข้อความตัวอย่าง)
 *   เพื่อไม่ให้รายการแจ้งเตือนถูกท่วมด้วยทุกข้อความ
 * - ส่ง socket event `new_notification` ให้ผู้รับเพื่ออัปเดตตัวเลขแจ้งเตือนแบบเรียลไทม์
 * - ถ้าพลาด จะแค่ log ไม่ทำให้การส่งข้อความล้มเหลว
 */
async function notifyOne({ io, recipientId, conversationId, message, kind, partyId, partyTitle, chatKey }: NoticeInput) {
  try {
    // ผู้รับกำลังเปิดห้องแชทนี้อยู่ → เห็นข้อความทันทีแล้ว ไม่ต้องแจ้งเตือน
    const sockets = io ? await io.in(`user_${recipientId}`).fetchSockets() : [];
    if (sockets.some((s: any) => s.data?.activeChat === chatKey)) return;
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        readAt: null,
        payload: { path: ['conversationId'], equals: conversationId },
      },
      orderBy: { createdAt: 'desc' },
    });
    const previousCount = Number((existing?.payload as any)?.count) || 0;
    const payload = {
      kind,
      conversationId,
      partyId: partyId ?? null,
      partyTitle: partyTitle ?? null,
      senderId: message.sender.id,
      senderName: message.sender.username,
      preview: message.content.slice(0, 80),
      count: previousCount + 1,
    };
    const notification = existing
      ? await prisma.notification.update({ where: { id: existing.id }, data: { payload, createdAt: new Date() } })
      : await prisma.notification.create({ data: { userId: recipientId, type: 'NEW_MESSAGE', payload } });
    io?.to(`user_${recipientId}`).emit('new_notification', notification);
  } catch (error) {
    console.error('Failed to create message notification:', error);
  }
}

/** แจ้งเตือนเพื่อนเมื่อมีข้อความส่วนตัวใหม่ */
export async function notifyDirectMessage(io: any, message: MessageLike, friendId: number, conversationId: number) {
  await notifyOne({ io, recipientId: friendId, conversationId, message, kind: 'DIRECT', chatKey: `direct:${message.sender.id}` });
}

/** แจ้งเตือนสมาชิกปาร์ตี้ (ที่ ACCEPTED ยกเว้นผู้ส่งและคนที่บล็อกกัน) เมื่อมีข้อความใหม่ */
export async function notifyPartyMessage(io: any, message: MessageLike, partyId: number, conversationId: number) {
  try {
    const senderId = message.sender.id;
    const [party, members, blocks] = await Promise.all([
      prisma.party.findUnique({ where: { id: partyId }, select: { title: true } }),
      prisma.partyMember.findMany({
        where: { partyId, status: 'ACCEPTED', userId: { not: senderId } },
        select: { userId: true },
      }),
      prisma.userBlock.findMany({
        where: { OR: [{ blockerId: senderId }, { blockedId: senderId }] },
        select: { blockerId: true, blockedId: true },
      }),
    ]);
    const blockedIds = new Set(blocks.map(b => (b.blockerId === senderId ? b.blockedId : b.blockerId)));
    await Promise.all(
      members
        .filter(m => !blockedIds.has(m.userId))
        .map(m => notifyOne({
          io, recipientId: m.userId, conversationId, message, kind: 'PARTY', partyId, partyTitle: party?.title, chatKey: `party:${partyId}`,
        })),
    );
  } catch (error) {
    console.error('Failed to notify party members:', error);
  }
}

/** ทำเครื่องหมายว่าอ่านแล้วสำหรับแจ้งเตือนข้อความของห้องนี้ (เรียกตอนผู้ใช้เปิดห้องแชท) */
export async function markConversationNotificationsRead(io: any, userId: number, conversationId: number) {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId, type: 'NEW_MESSAGE', readAt: null, payload: { path: ['conversationId'], equals: conversationId } },
      data: { readAt: new Date() },
    });
    if (result.count > 0) io?.to(`user_${userId}`).emit('notifications_changed');
  } catch (error) {
    console.error('Failed to mark message notifications read:', error);
  }
}
