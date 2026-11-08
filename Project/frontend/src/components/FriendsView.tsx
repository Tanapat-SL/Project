import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, UserPlus, UserX, Users, Clock, Search, Trash2, UserSearch } from 'lucide-react';
import { apiClient } from '../api/client';

// ─── Types ───────────────────────────────────────────────────────
interface FriendUser {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface FriendRequest {
  id: number;
  requesterId: number;
  receiverId: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  requester: FriendUser;
}

interface SearchedUser extends FriendUser {
  friendStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
}

// ─── Helper ───────────────────────────────────────────────────────
function Avatar({ user, size = 'w-10 h-10' }: { user: FriendUser; size?: string }) {
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.username} className={`${size} rounded-full object-cover bg-gray-700 shrink-0`} />
  ) : (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#ff5b2d] to-[#c0392b] flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {(user.displayName || user.username).slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function FriendsView() {
  const [tab, setTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionBusy, setActionBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Tab "เพิ่มเพื่อน" state ──────────────────────────────────
  const [addSearch, setAddSearch] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<SearchedUser[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addSearchError, setAddSearchError] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendsRes, requestsRes, meRes] = await Promise.all([
        apiClient.get<FriendUser[]>('/friends'),
        apiClient.get<FriendRequest[]>('/friends/requests'),
        apiClient.get<{ id: number }>('/auth/me'),
      ]);
      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
      setCurrentUserId(Number(meRes.data.id));
    } catch {
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // ─── ยอมรับ / ปฏิเสธ ─────────────────────────────────────────
  const handleRequest = async (requestId: number, status: 'ACCEPTED' | 'REJECTED') => {
    setActionBusy(requestId);
    try {
      await apiClient.patch(`/friends/requests/${requestId}`, { status });
      await loadAll();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setActionBusy(null);
    }
  };

  // ─── ลบเพื่อน ─────────────────────────────────────────────────
  const handleRemove = async (friendId: number, name: string) => {
    if (!confirm(`ต้องการลบ ${name} ออกจากรายชื่อเพื่อนใช่ไหม?`)) return;
    setActionBusy(friendId);
    try {
      await apiClient.delete(`/friends/${friendId}`);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setActionBusy(null);
    }
  };

  // ─── ค้นหาผู้เล่นเพื่อเพิ่มเพื่อน ───────────────────────────
  const handleAddSearch = async (q: string) => {
    setAddSearch(q);
    if (!q.trim()) { setAddSearchResults([]); return; }
    setAddSearchLoading(true);
    setAddSearchError(null);
    try {
      const res = await apiClient.get<SearchedUser[]>(`/users/search?q=${encodeURIComponent(q)}`);
      const otherUsers = res.data.filter(user => user.id !== currentUserId);
      // ตรวจสอบ status เพื่อน
      const withStatus = await Promise.all(
        otherUsers.map(async (u) => {
          try {
            const s = await apiClient.get<{ status: SearchedUser['friendStatus'] }>(`/friends/status/${u.id}`);
            return { ...u, friendStatus: s.data.status };
          } catch {
            return { ...u, friendStatus: 'none' as const };
          }
        })
      );
      setAddSearchResults(withStatus);
    } catch {
      setAddSearchError('ค้นหาไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setAddSearchLoading(false);
    }
  };

  // ─── ส่งคำขอเพิ่มเพื่อน ───────────────────────────────────────
  const handleSendRequest = async (userId: number) => {
    if (userId === currentUserId) return;
    setActionBusy(userId);
    try {
      await apiClient.post('/friends/requests', { userId });
      setSentRequests(prev => new Set(prev).add(userId));
      setAddSearchResults(prev =>
        prev.map(u => u.id === userId ? { ...u, friendStatus: 'pending_sent' } : u)
      );
    } catch {
      setError('ส่งคำขอไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setActionBusy(null);
    }
  };

  const filteredFriends = friends.filter(f => {
    const q = search.toLowerCase();
    return !q || f.username.toLowerCase().includes(q) || (f.displayName || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5b2d] to-[#c0392b] flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">เพื่อนของฉัน</h1>
          <p className="text-sm text-gray-400">จัดการรายชื่อเพื่อนและคำขอเพิ่มเพื่อน</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.04] p-1 rounded-xl w-fit">
        <TabBtn label={`เพื่อน (${friends.length})`} active={tab === 'friends'} onClick={() => setTab('friends')} />
        <TabBtn
          label={`คำขอ${requests.length > 0 ? ` (${requests.length})` : ''}`}
          active={tab === 'requests'}
          onClick={() => setTab('requests')}
          badge={requests.length}
        />
        <TabBtn
          label="เพิ่มเพื่อน"
          active={tab === 'add'}
          onClick={() => setTab('add')}
          icon={<UserPlus className="w-3.5 h-3.5" />}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ─── Tab: เพื่อน ─────────────────────────────────────── */}
      {tab === 'friends' && (
        <>
          {/* ค้นหา */}
          <div className="relative mb-5">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff5b2d]/60"
              placeholder="ค้นหาเพื่อน..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <LoadingRows count={3} />
          ) : filteredFriends.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-gray-500" />}
              title={search ? 'ไม่พบเพื่อนที่ค้นหา' : 'ยังไม่มีเพื่อนเลย'}
              desc={search ? 'ลองเปลี่ยนคำค้นหาดูนะ' : 'กดแท็บ "เพิ่มเพื่อน" เพื่อค้นหาผู้เล่นและส่งคำขอเพิ่มเพื่อน'}
            />
          ) : (
            <ul className="space-y-3">
              {filteredFriends.map(friend => (
                <li key={friend.id} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl hover:border-white/[0.12] transition-colors">
                  <Avatar user={friend} />
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${friend.id}`} className="font-semibold text-white hover:text-[#ff5b2d] transition-colors">
                      {friend.displayName || friend.username}
                    </Link>
                    {friend.displayName && (
                      <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(friend.id, friend.displayName || friend.username)}
                    disabled={actionBusy === friend.id}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                    title="ลบเพื่อน"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{actionBusy === friend.id ? 'กำลังลบ...' : 'ลบเพื่อน'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ─── Tab: คำขอเพิ่มเพื่อน ────────────────────────────── */}
      {tab === 'requests' && (
        <>
          {loading ? (
            <LoadingRows count={2} />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="w-8 h-8 text-gray-500" />}
              title="ไม่มีคำขอเพิ่มเพื่อนใหม่"
              desc="เมื่อมีคนส่งคำขอมา จะปรากฏที่นี่"
            />
          ) : (
            <ul className="space-y-3">
              {requests.map(req => (
                <li key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar user={req.requester} />
                    <div className="min-w-0">
                      <Link to={`/profile/${req.requester.id}`} className="font-semibold text-white hover:text-[#ff5b2d] transition-colors">
                        {req.requester.displayName || req.requester.username}
                      </Link>
                      {req.requester.displayName && (
                        <p className="text-xs text-gray-500">@{req.requester.username}</p>
                      )}
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <button
                      onClick={() => handleRequest(req.id, 'ACCEPTED')}
                      disabled={actionBusy === req.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#ff5b2d] hover:bg-[#e04e24] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" /> ยอมรับ
                    </button>
                    <button
                      onClick={() => handleRequest(req.id, 'REJECTED')}
                      disabled={actionBusy === req.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" /> ปฏิเสธ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ─── Tab: เพิ่มเพื่อน (ค้นหาผู้เล่น) ────────────────── */}
      {tab === 'add' && (
        <>
          <div className="relative mb-5">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff5b2d]/60"
              placeholder="ค้นหาผู้เล่นด้วย username หรือ display name..."
              value={addSearch}
              onChange={e => handleAddSearch(e.target.value)}
            />
          </div>

          {addSearchError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {addSearchError}
            </div>
          )}

          {addSearchLoading ? (
            <LoadingRows count={3} />
          ) : !addSearch.trim() ? (
            <EmptyState
              icon={<UserSearch className="w-8 h-8 text-gray-500" />}
              title="ค้นหาผู้เล่น"
              desc="พิมพ์ username หรือชื่อผู้เล่นเพื่อค้นหาและส่งคำขอเพิ่มเพื่อน"
            />
          ) : addSearchResults.length === 0 ? (
            <EmptyState
              icon={<UserSearch className="w-8 h-8 text-gray-500" />}
              title="ไม่พบผู้เล่น"
              desc="ลองค้นหาด้วยชื่ออื่น"
            />
          ) : (
            <ul className="space-y-3">
              {addSearchResults.map(user => {
                const isSent = sentRequests.has(user.id) || user.friendStatus === 'pending_sent';
                const isFriend = user.friendStatus === 'friends';
                const isPendingReceived = user.friendStatus === 'pending_received';

                return (
                  <li key={user.id} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl hover:border-white/[0.12] transition-colors">
                    <Avatar user={user} />
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${user.id}`} className="font-semibold text-white hover:text-[#ff5b2d] transition-colors">
                        {user.displayName || user.username}
                      </Link>
                      {user.displayName && (
                        <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                      )}
                    </div>

                    {/* ปุ่มตาม status */}
                    {isFriend ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg">
                        <UserCheck className="w-3.5 h-3.5" /> เป็นเพื่อนแล้ว
                      </span>
                    ) : isPendingReceived ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-lg">
                        <Clock className="w-3.5 h-3.5" /> รอการตอบรับ
                      </span>
                    ) : isSent ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold rounded-lg">
                        <Clock className="w-3.5 h-3.5" /> ส่งคำขอแล้ว
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        disabled={actionBusy === user.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#ff5b2d] hover:bg-[#e04e24] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
                      >
                        <UserPlus className="w-4 h-4" />
                        {actionBusy === user.id ? 'กำลังส่ง...' : 'เพิ่มเพื่อน'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────
function TabBtn({
  label, active, onClick, badge = 0, icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        active ? 'bg-[#ff5b2d] text-white shadow-sm' : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
      {badge > 0 && !active && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl animate-pulse">
          <div className="w-10 h-10 rounded-full bg-white/[0.08]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/[0.08] rounded w-32" />
            <div className="h-2.5 bg-white/[0.05] rounded w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon}
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-gray-500 max-w-xs">{desc}</p>
    </div>
  );
}
