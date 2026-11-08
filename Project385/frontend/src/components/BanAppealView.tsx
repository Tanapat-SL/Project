import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { socket } from '../api/socket';

type Appeal = { id: number; message: string; status: 'OPEN' | 'APPROVED' | 'REJECTED'; adminNote?: string | null; createdAt: string };
type Props = { reason?: string | null; bannedAt?: string | null; onUnbanned: () => void };

export default function BanAppealView({ reason, bannedAt, onUnbanned }: Props) {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAppeals = async () => {
    try {
      const { data } = await apiClient.get<Appeal[]>('/appeals/mine');
      setAppeals(data);
      if (data.some(appeal => appeal.status === 'APPROVED')) onUnbanned();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'โหลดสถานะคำอุทธรณ์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAppeals(); }, []);

  // ผู้ดูแลตรวจคำอุทธรณ์แล้ว → อัปเดตสถานะ/หมายเหตุทันที (ถ้าอนุมัติ จะปลดแบนผ่าน loadAppeals → onUnbanned)
  useEffect(() => {
    const onReviewed = () => { void loadAppeals(); };
    socket.on('appeal_reviewed', onReviewed);
    return () => { socket.off('appeal_reviewed', onReviewed); };
  }, []);

  const submitAppeal = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await apiClient.post('/appeals', { message: message.trim() });
      setMessage('');
      setNotice('ส่งคำอุทธรณ์แล้ว ผู้ดูแลจะตรวจสอบให้');
      await loadAppeals();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'ส่งคำอุทธรณ์ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-main min-h-screen p-5 text-white md:p-10">
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="glass-panel border-red-500/30 p-6 md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-sm font-bold text-red-300"><AlertTriangle className="h-4 w-4" /> ACCOUNT SUSPENDED</div>
          <h1 className="text-3xl font-bold text-white">บัญชีถูกระงับการใช้งาน</h1>
          <p className="mt-3 text-gray-300">ขณะนี้ไม่สามารถใช้แชท ปาร์ตี้ หรือฟีเจอร์อื่นได้ คุณสามารถยื่นอุทธรณ์เพื่อขอให้ผู้ดูแลตรวจสอบ</p>
          <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4 text-sm"><p className="font-semibold text-gray-300">เหตุผล</p><p className="mt-1 whitespace-pre-wrap text-white">{reason || 'ละเมิดกฎชุมชน'}</p>{bannedAt && <p className="mt-2 text-xs text-gray-400">ระงับเมื่อ {new Date(bannedAt).toLocaleString()}</p>}</div>
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{notice}</div>}
        {!appeals.some(appeal => appeal.status === 'OPEN') && <form onSubmit={submitAppeal} className="glass-panel space-y-4 p-6"><h2 className="text-xl font-bold text-white">ยื่นอุทธรณ์</h2><p className="text-sm text-gray-400">อธิบายสถานการณ์และเหตุผลที่ต้องการให้ตรวจสอบ (20–2,000 ตัวอักษร)</p><textarea required minLength={20} maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} className="min-h-36 w-full rounded-xl border border-gray-700 bg-gray-800 p-3 text-white outline-none focus:border-mf-primary" placeholder="เขียนคำอุทธรณ์ของคุณ..." /><div className="flex items-center justify-between gap-3"><span className="text-xs text-gray-500">{message.length}/2000</span><button type="submit" disabled={submitting || message.trim().length < 20} className="inline-flex items-center gap-2 rounded-lg bg-mf-primary px-4 py-2.5 font-bold text-white disabled:opacity-50">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} ส่งคำอุทธรณ์</button></div></form>}
        <section className="glass-panel space-y-4 p-6"><h2 className="flex items-center gap-2 text-xl font-bold text-white"><ShieldCheck className="h-5 w-5 text-mf-primary" /> ประวัติคำอุทธรณ์</h2>{loading ? <div className="flex items-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> กำลังโหลด...</div> : appeals.length === 0 ? <p className="text-sm text-gray-400">ยังไม่มีคำอุทธรณ์</p> : appeals.map(appeal => <article key={appeal.id} className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-gray-400">{new Date(appeal.createdAt).toLocaleString()}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${appeal.status === 'OPEN' ? 'bg-amber-500/15 text-amber-300' : appeal.status === 'APPROVED' ? 'bg-green-500/15 text-green-300' : 'bg-gray-500/15 text-gray-300'}`}>{appeal.status}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-gray-200">{appeal.message}</p>{appeal.adminNote && <p className="mt-3 border-t border-white/10 pt-3 text-sm text-gray-300"><span className="font-semibold">หมายเหตุจากผู้ดูแล: </span>{appeal.adminNote}</p>}</article>)}</section>
      </section>
    </main>
  );
}
