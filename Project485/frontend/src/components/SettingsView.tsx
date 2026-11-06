import { useEffect, useState } from 'react';
import { Accessibility, Ban, Check, LoaderCircle, Palette, Shield, UserRound, X } from 'lucide-react';
import { apiClient } from '../api/client';

type ThemeName = 'dark' | 'light' | 'purple';
type BlockedUser = { id: number; username: string; displayName?: string | null; avatarUrl?: string | null; blockedAt: string };

const themes: { id: ThemeName; name: string; description: string; swatches: string[] }[] = [
  { id: 'dark', name: 'Dark', description: 'ธีมมืด', swatches: ['#0b0f19', '#dc2626', '#b91c1c'] },
  { id: 'light', name: 'MATCHFOUND Light', description: 'พื้นหลังสีเทาและสีแดงแบบหน้าแนะนำเว็บ', swatches: ['#e8e8e6', '#dc2626', '#b91c1c'] },
  { id: 'purple', name: 'Midnight Purple', description: 'โทนม่วงเข้ม', swatches: ['#100b1e', '#dc2626', '#b91c1c'] },
];

export default function SettingsView({ embedded = false }: { embedded?: boolean }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const savedTheme = localStorage.getItem('mf_theme');
    return savedTheme === 'light' || savedTheme === 'purple' ? savedTheme : 'dark';
  });
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('mf_reduce_motion') === 'true');
  const [compactLayout, setCompactLayout] = useState(localStorage.getItem('mf_compact_layout') === 'true');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    apiClient.get('/blocks')
      .then(({ data }) => setBlockedUsers(data))
      .catch(() => setBlockedUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
    localStorage.setItem('mf_reduce_motion', String(reduceMotion));
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.dataset.density = compactLayout ? 'compact' : 'comfortable';
    localStorage.setItem('mf_compact_layout', String(compactLayout));
  }, [compactLayout]);

  const changeTheme = (nextTheme: ThemeName) => {
    setTheme(nextTheme);
    localStorage.setItem('mf_theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  const unblock = async (userId: number) => {
    setRemovingId(userId);
    try {
      await apiClient.delete(`/blocks/${userId}`);
      setBlockedUsers(current => current.filter(user => user.id !== userId));
    } catch {
      alert('ยกเลิกการบล็อกไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20 space-y-6">
      {!embedded && <header>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-gray-400">ปรับแต่งหน้าตาและจัดการความปลอดภัยของบัญชี</p>
      </header>}

      <section className="glass-panel p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Palette className="h-5 w-5 text-mf-primary" /> Theme</h2>
        <p className="mt-1 mb-5 text-sm text-gray-400">เลือกสีที่ต้องการ ระบบจะบันทึกไว้ในอุปกรณ์นี้</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map(option => (
            <button key={option.id} type="button" onClick={() => changeTheme(option.id)} className={`rounded-xl border p-4 text-left transition-colors ${theme === option.id ? 'border-mf-primary ring-2 ring-mf-primary/30' : 'border-gray-700 hover:border-gray-500'}`}>
              <div className="mb-3 flex h-10 overflow-hidden rounded-lg border border-gray-700">
                {option.swatches.map(color => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}
              </div>
              <div className="flex items-center justify-between"><span className="font-semibold text-white">{option.name}</span>{theme === option.id && <Check className="h-4 w-4 text-mf-primary" />}</div>
              <p className="mt-1 text-xs text-gray-400">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Accessibility className="h-5 w-5 text-mf-primary" /> Accessibility</h2>
        <p className="mt-1 mb-5 text-sm text-gray-400">ปรับการเคลื่อนไหวและความหนาแน่นของหน้าจอ โดยบันทึกไว้ในอุปกรณ์นี้</p>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <span><span className="block font-semibold text-white">ลดการเคลื่อนไหว</span><span className="mt-1 block text-sm text-gray-400">ลดแอนิเมชันและเอฟเฟกต์การเปลี่ยนหน้า</span></span>
            <input type="checkbox" checked={reduceMotion} onChange={event => setReduceMotion(event.target.checked)} className="h-5 w-5 accent-mf-primary" />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <span><span className="block font-semibold text-white">เลย์เอาต์กะทัดรัด</span><span className="mt-1 block text-sm text-gray-400">ลดระยะขอบของพื้นที่เนื้อหาเพื่อให้เห็นข้อมูลมากขึ้น</span></span>
            <input type="checkbox" checked={compactLayout} onChange={event => setCompactLayout(event.target.checked)} className="h-5 w-5 accent-mf-primary" />
          </label>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Shield className="h-5 w-5 text-mf-primary" /> Blocked users</h2>
        <p className="mt-1 mb-5 text-sm text-gray-400">ดูรายชื่อที่บล็อกไว้ และยกเลิกการบล็อกได้ที่นี่</p>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : blockedUsers.length === 0 ? (
          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5 text-center text-sm text-gray-400"><Ban className="mx-auto mb-2 h-5 w-5" />ยังไม่มีผู้ใช้ที่บล็อกไว้</div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/40 p-3">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-700"><UserRound className="h-5 w-5 text-gray-300" /></div>}
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{user.displayName || user.username}</p><p className="truncate text-xs text-gray-400">{user.username} · บล็อกเมื่อ {new Date(user.blockedAt).toLocaleDateString()}</p></div>
                <button type="button" onClick={() => unblock(user.id)} disabled={removingId === user.id} className="flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:border-mf-primary hover:text-white disabled:opacity-50">
                  {removingId === user.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
