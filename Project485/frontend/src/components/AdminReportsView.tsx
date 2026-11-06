import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Ban, Check, LoaderCircle, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

type Report = {
  id: number;
  category: 'PROFANITY' | 'TOXIC' | 'AFK' | 'DISRUPTION' | 'HARASSMENT';
  reason: string;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  createdAt: string;
  reporter: { id: number; username: string; displayName?: string | null; avatarUrl?: string | null };
  targetUser: { id: number; username: string; displayName?: string | null; avatarUrl?: string | null; isBanned: boolean; isAdmin: boolean; banReason?: string | null; bannedAt?: string | null };
};
type Appeal = { id: number; message: string; status: 'OPEN' | 'APPROVED' | 'REJECTED'; adminNote?: string | null; createdAt: string; user: { id: number; username: string; displayName?: string | null; isBanned: boolean; banReason?: string | null } };

const categoryNames: Record<Report['category'], string> = {
  PROFANITY: 'พิมพ์คำหยาบ',
  TOXIC: 'พฤติกรรม Toxic',
  AFK: 'AFK',
  DISRUPTION: 'ก่อกวน',
  HARASSMENT: 'คุกคาม',
};

export default function AdminReportsView() {
  const [activeTab, setActiveTab] = useState<'reports' | 'appeals'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealsLoading, setAppealsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get<Report[]>('/admin/reports');
      setReports(data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'โหลดรายการรีพอร์ตไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const loadAppeals = useCallback(async () => {
    setAppealsLoading(true);
    try {
      const { data } = await apiClient.get<Appeal[]>('/admin/appeals');
      setAppeals(data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'โหลดคำอุทธรณ์ไม่สำเร็จ');
    } finally {
      setAppealsLoading(false);
    }
  }, []);

  useEffect(() => { void loadAppeals(); }, [loadAppeals]);

  const setStatus = async (reportId: number, status: Report['status']) => {
    setUpdatingId(reportId);
    try {
      await apiClient.patch(`/admin/reports/${reportId}`, { status });
      setReports(current => current.map(report => report.id === reportId ? { ...report, status } : report));
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleBan = async (report: Report) => {
    const target = report.targetUser;
    try {
      if (target.isBanned) {
        await apiClient.delete(`/admin/users/${target.id}/ban`);
        setReports(current => current.map(item => item.targetUser.id === target.id ? { ...item, targetUser: { ...item.targetUser, isBanned: false, banReason: null, bannedAt: null } } : item));
      } else {
        const reason = window.prompt(`เหตุผลการแบน ${target.displayName || target.username}`, 'ละเมิดกฎชุมชน');
        if (reason === null) return;
        await apiClient.post(`/admin/users/${target.id}/ban`, { reason });
        setReports(current => current.map(item => item.targetUser.id === target.id ? { ...item, targetUser: { ...item.targetUser, isBanned: true, banReason: reason || 'ละเมิดกฎชุมชน', bannedAt: new Date().toISOString() } } : item));
      }
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'เปลี่ยนสถานะแบนไม่สำเร็จ');
    }
  };

  const reviewAppeal = async (appeal: Appeal, status: 'APPROVED' | 'REJECTED') => {
    const adminNote = window.prompt(status === 'APPROVED' ? 'หมายเหตุ (ไม่บังคับ)' : 'เหตุผลที่ไม่อนุมัติ (ไม่บังคับ)', '') ?? '';
    try {
      await apiClient.patch(`/admin/appeals/${appeal.id}`, { status, adminNote });
      setAppeals(current => current.map(item => item.id === appeal.id ? { ...item, status, adminNote: adminNote || null, user: status === 'APPROVED' ? { ...item.user, isBanned: false, banReason: null } : item.user } : item));
      if (status === 'APPROVED') setReports(current => current.map(item => item.targetUser.id === appeal.user.id ? { ...item, targetUser: { ...item.targetUser, isBanned: false, banReason: null, bannedAt: null } } : item));
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'ตรวจคำอุทธรณ์ไม่สำเร็จ');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300"><BadgeCheck className="h-4 w-4" /> ADMIN</div>
          <h1 className="text-3xl font-bold text-white">Log Report</h1>
          <p className="mt-1 text-sm text-gray-400">ตรวจสอบรายงาน จัดการการระงับบัญชี และพิจารณาคำอุทธรณ์</p>
        </div>
        <button type="button" onClick={() => void loadReports()} className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-mf-primary hover:text-white"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      <div className="flex w-fit gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
        <button type="button" onClick={() => setActiveTab('reports')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'reports' ? 'bg-mf-primary text-white' : 'text-gray-400 hover:text-white'}`}>Log Report ({reports.length})</button>
        <button type="button" onClick={() => setActiveTab('appeals')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'appeals' ? 'bg-mf-primary text-white' : 'text-gray-400 hover:text-white'}`}>Appeals ({appeals.filter(appeal => appeal.status === 'OPEN').length})</button>
      </div>
      {activeTab === 'reports' && (loading ? <div className="glass-panel flex items-center justify-center gap-2 p-10 text-gray-400"><LoaderCircle className="h-5 w-5 animate-spin" /> กำลังโหลดรีพอร์ต...</div> : reports.length === 0 ? (
        <div className="glass-panel p-10 text-center text-gray-400"><ShieldAlert className="mx-auto mb-3 h-8 w-8" />ยังไม่มีรีพอร์ต</div>
      ) : reports.map(report => (
        <article key={report.id} className="glass-panel space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-gray-300">#{report.id}</span>
              <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-sm font-bold text-orange-300">{categoryNames[report.category]}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${report.status === 'OPEN' ? 'bg-red-500/15 text-red-300' : report.status === 'REVIEWED' ? 'bg-green-500/15 text-green-300' : 'bg-gray-500/15 text-gray-300'}`}>{report.status}</span>
            </div>
            <time className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleString()}</time>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><p className="mb-1 text-xs uppercase text-gray-500">ผู้ถูกรายงาน</p><Link to={`/profile/${report.targetUser.id}`} className="font-semibold text-white hover:text-mf-primary">{report.targetUser.displayName || report.targetUser.username}</Link><span className="ml-2 text-gray-500">@{report.targetUser.username}</span>{report.targetUser.isAdmin && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">ADMIN</span>}{report.targetUser.isBanned && <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">BANNED</span>}</div>
            <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><p className="mb-1 text-xs uppercase text-gray-500">ผู้รายงาน</p><Link to={`/profile/${report.reporter.id}`} className="font-semibold text-white hover:text-mf-primary">{report.reporter.displayName || report.reporter.username}</Link><span className="ml-2 text-gray-500">@{report.reporter.username}</span></div>
          </div>
          <div><p className="mb-1 text-xs uppercase text-gray-500">รายละเอียด</p><p className="whitespace-pre-wrap break-words text-sm text-gray-200">{report.reason}</p></div>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-3">
            <button type="button" disabled={updatingId === report.id || report.status === 'REVIEWED'} onClick={() => void setStatus(report.id, 'REVIEWED')} className="rounded-lg border border-green-500/30 px-3 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/10 disabled:opacity-40">Mark reviewed</button>
            <button type="button" disabled={updatingId === report.id || report.status === 'DISMISSED'} onClick={() => void setStatus(report.id, 'DISMISSED')} className="rounded-lg border border-gray-500/30 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-500/10 disabled:opacity-40">Dismiss</button>
            {report.status !== 'OPEN' && <button type="button" disabled={updatingId === report.id} onClick={() => void setStatus(report.id, 'OPEN')} className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 disabled:opacity-40">Reopen</button>}
            {report.targetUser.isAdmin ? <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300">ADMIN · ป้องกันการแบน</span> : <button type="button" onClick={() => void toggleBan(report)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${report.targetUser.isBanned ? 'border-green-500/30 text-green-300 hover:bg-green-500/10' : 'border-red-500/30 text-red-300 hover:bg-red-500/10'}`}>{report.targetUser.isBanned ? <><ShieldCheck className="h-3.5 w-3.5" /> Unban account</> : <><Ban className="h-3.5 w-3.5" /> Ban account</>}</button>}
            {updatingId === report.id && <LoaderCircle className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
        </article>
      )))}
      {activeTab === 'appeals' && (appealsLoading ? <div className="glass-panel flex items-center justify-center gap-2 p-10 text-gray-400"><LoaderCircle className="h-5 w-5 animate-spin" /> กำลังโหลดคำอุทธรณ์...</div> : appeals.length === 0 ? <div className="glass-panel p-10 text-center text-gray-400">ยังไม่มีคำอุทธรณ์</div> : appeals.map(appeal => (
        <article key={appeal.id} className="glass-panel space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-white">{appeal.user.displayName || appeal.user.username} <span className="font-normal text-gray-400">@{appeal.user.username}</span></p><p className="mt-1 text-xs text-gray-500">คำอุทธรณ์ #{appeal.id} · {new Date(appeal.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${appeal.status === 'OPEN' ? 'bg-amber-500/15 text-amber-300' : appeal.status === 'APPROVED' ? 'bg-green-500/15 text-green-300' : 'bg-gray-500/15 text-gray-300'}`}>{appeal.status}</span></div>
          <div className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="mb-1 text-xs uppercase text-gray-500">เหตุผลการระงับเดิม</p><p className="text-sm text-gray-300">{appeal.user.banReason || 'ไม่ระบุ'}</p><p className="mt-3 whitespace-pre-wrap text-sm text-white">{appeal.message}</p></div>
          {appeal.adminNote && <p className="text-sm text-gray-400">หมายเหตุ: {appeal.adminNote}</p>}
          {appeal.status === 'OPEN' && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void reviewAppeal(appeal, 'APPROVED')} className="inline-flex items-center gap-1 rounded-lg border border-green-500/30 px-3 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/10"><Check className="h-4 w-4" /> อนุมัติและปลดแบน</button><button type="button" onClick={() => void reviewAppeal(appeal, 'REJECTED')} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10">ปฏิเสธ</button></div>}
        </article>
      )))}
    </div>
  );
}
