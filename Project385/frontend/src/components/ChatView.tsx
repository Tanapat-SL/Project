import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, UserRound } from 'lucide-react';
import { apiClient } from '../api/client';
import { socket } from '../api/socket';

type Party = {
  id: number;
  title: string;
  game?: { name: string };
  members?: Array<{ user?: ChatUser }>;
};

type ChatUser = {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type ChatMessage = {
  id: number;
  content: string;
  createdAt: string;
  partyId?: number;
  sender: ChatUser;
};

export default function ChatView({ currentUser }: { currentUser: ChatUser | null }) {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<number[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<ChatUser | null>(null);
  const [chatMode, setChatMode] = useState<'party' | 'direct'>('party');
  const [safetyTarget, setSafetyTarget] = useState<any>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState<'PROFANITY' | 'TOXIC' | 'AFK' | 'DISRUPTION' | 'HARASSMENT'>('TOXIC');
  const [safetyStatus, setSafetyStatus] = useState('');
  const [chatWarnings, setChatWarnings] = useState(0);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const isChatMuted = Boolean(mutedUntil && new Date(mutedUntil).getTime() > clock);
  const activeContact = chatMode === 'party' ? selectedParty : selectedFriend;
  const canSendMessage = chatMode === 'party' ? Boolean(selectedParty) : Boolean(selectedFriend);

  useEffect(() => {
    apiClient.get('/parties/mine').then(({ data }) => {
      setParties(data);
      setSelectedParty(data[0] || null);
    }).catch(() => setParties([]));
    apiClient.get('/friends').then(({ data }) => setFriends(data)).catch(() => setFriends([]));
    apiClient.get('/blocks').then(({ data }) => setBlockedUserIds(data.map((user: ChatUser) => user.id))).catch(() => setBlockedUserIds([]));
    apiClient.get('/chat/status').then(({ data }) => {
      setChatWarnings(data.warnings || 0);
      setMutedUntil(data.mutedUntil || null);
    }).catch(() => undefined);
  }, []);

  // บอกเซิร์ฟเวอร์ว่ากำลังเปิดห้องไหนอยู่ จะได้ไม่ส่งแจ้งเตือนซ้ำของห้องนี้
  useEffect(() => {
    const chatKey = chatMode === 'party'
      ? (selectedParty ? `party:${selectedParty.id}` : null)
      : (selectedFriend ? `direct:${selectedFriend.id}` : null);
    const emitFocus = () => socket.emit('chat_focus', chatKey);
    emitFocus();
    socket.on('connect', emitFocus);
    return () => {
      socket.off('connect', emitFocus);
      socket.emit('chat_focus', null);
    };
  }, [chatMode, selectedParty, selectedFriend]);

  useEffect(() => {
    if (!mutedUntil) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [mutedUntil]);

  useEffect(() => {
    if (!selectedFriend || chatMode !== 'direct') return;
    apiClient.get(`/chat/direct/${selectedFriend.id}`).then(({ data }) => setMessages(data)).catch(() => setMessages([]));
    const receiveMessage = (message: ChatMessage) => {
      if (!message.partyId && !blockedUserIds.includes(message.sender.id)) setMessages((current) => current.some(item => item.id === message.id) ? current : [...current, message]);
    };
    socket.on('receive_direct_message', receiveMessage);
    return () => {
      socket.off('receive_direct_message', receiveMessage);
    };
  }, [selectedFriend, chatMode, blockedUserIds]);

  useEffect(() => {
    if (chatMode !== 'party') return;
    if (!selectedParty) return;

    apiClient.get(`/chat/party/${selectedParty.id}`)
      .then(({ data }) => setMessages(data))
      .catch(() => setMessages([]));

    socket.emit('join_party_room', selectedParty.id);
    const receiveMessage = (message: ChatMessage) => {
      if (message.partyId === selectedParty.id && !blockedUserIds.includes(message.sender.id)) {
        setMessages((current) => current.some((item) => item.id === message.id)
          ? current
          : [...current, message]);
      }
    };
    socket.on('receive_party_message', receiveMessage);

    return () => {
      socket.off('receive_party_message', receiveMessage);
    };
  }, [selectedParty, blockedUserIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!canSendMessage || isChatMuted || !content.trim()) return;
    const messageText = content.trim();
    setContent('');
    setSafetyStatus('');
    try {
      if (chatMode === 'direct' && selectedFriend) {
        const { data } = await apiClient.post(`/chat/direct/${selectedFriend.id}`, { content: messageText });
        setMessages(current => [...current, data]);
        return;
      }
      if (!selectedParty) return;
      const { data } = await apiClient.post(`/chat/party/${selectedParty.id}`, { content: messageText });
      setMessages((current) => [...current.filter((message) => message.id !== data.id), data]);
    } catch (error: any) {
      setContent(messageText);
      const response = error.response?.data;
      if (response?.code === 'PROFANITY_WARNING') {
        setChatWarnings(response.warnings || 0);
        setSafetyStatus(response.message);
      } else if (response?.code === 'CHAT_MUTED') {
        setChatWarnings(0);
        setMutedUntil(response.mutedUntil || null);
        setSafetyStatus(response.message || 'ครบ 3 คำเตือนแล้ว ระงับการแชททุกห้องเป็นเวลา 30 นาที');
      } else {
        setSafetyStatus(response?.message || 'ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    }
  };

  const submitSafety = async (action: 'reports' | 'blocks') => {
    if (!safetyTarget) return;
    if (safetyTarget.id === currentUser?.id) {
      setSafetyStatus('ไม่สามารถรายงานหรือบล็อกบัญชีตัวเองได้');
      setSafetyTarget(null);
      return;
    }
    try {
      await apiClient.post(`/${action}`, action === 'reports'
        ? { targetUserId: safetyTarget.id, category: reportCategory, reason: reportReason.trim() }
        : { userId: safetyTarget.id });
      setSafetyStatus(action === 'reports' ? 'Report submitted.' : 'Player blocked.');
      if (action === 'blocks') {
        setBlockedUserIds(current => current.includes(safetyTarget.id) ? current : [...current, safetyTarget.id]);
        setFriends(current => current.filter(friend => friend.id !== safetyTarget.id));
        setMessages(current => current.filter(message => message.sender.id !== safetyTarget.id));
        if (selectedFriend?.id === safetyTarget.id) {
          setSelectedFriend(null);
          setMessages([]);
        }
      }
      setSafetyTarget(null);
      setReportReason('');
      setReportCategory('TOXIC');
    } catch (error: any) {
      setSafetyStatus(error.response?.data?.message || 'Unable to submit safety action.');
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {safetyStatus && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl border border-red-500/30 bg-white px-4 py-3 text-sm text-gray-800 shadow-xl">{safetyStatus}</div>}
      <div className="w-full md:w-80 glass-panel p-4 flex flex-col h-1/3 md:h-full flex-shrink-0">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setChatMode('party')} className={`py-2 rounded-lg text-sm ${chatMode === 'party' ? 'bg-mf-primary text-white' : 'bg-gray-800 text-gray-300'}`}>Party lobby</button>
          <button onClick={() => setChatMode('direct')} className={`py-2 rounded-lg text-sm ${chatMode === 'direct' ? 'bg-mf-primary text-white' : 'bg-gray-800 text-gray-300'}`}>Friends</button>
        </div>
        {chatMode === 'party' ? (
        <div className="space-y-2 overflow-y-auto pr-2">
          {!parties.length && <p className="text-sm text-gray-500 px-2">Join a party to access its chat.</p>}
          {parties.map((party) => (
            <div
              key={party.id}
              onClick={() => setSelectedParty(party)}
              className={`p-3 rounded-xl cursor-pointer transition-colors ${selectedParty?.id === party.id ? 'bg-mf-primary/10 border border-mf-primary/20' : 'hover:bg-gray-800/50'}`}
            >
              <span className="font-semibold text-white truncate block">{party.title}</span>
              <p className="text-sm text-gray-500 truncate">{party.game?.name || 'Party chat'}</p>
            </div>
          ))}
        </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-2">
            {!friends.length && <p className="text-sm text-gray-500 px-2">Add a friend before starting direct chat.</p>}
            {friends.map(friend => (
              <div key={friend.id} className={`flex items-center gap-2 rounded-xl p-2 transition-colors ${selectedFriend?.id === friend.id ? 'bg-mf-primary/10 border border-mf-primary/20' : 'hover:bg-gray-800/50'}`}>
                <button onClick={() => setSelectedFriend(friend)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Avatar user={friend} className="h-10 w-10" />
                  <span className="min-w-0 truncate font-semibold text-white">{friend.displayName || friend.username}</span>
                </button>
                <Link to={`/profile/${friend.id}`} aria-label={`View ${friend.displayName || friend.username}'s profile`} title="View profile" className="rounded-lg p-2 text-gray-500 hover:bg-mf-primary/10 hover:text-mf-primary"><UserRound className="h-4 w-4" /></Link>
              </div>
            ))}
          </div>
        )}
        {chatMode === 'party' && selectedParty && (
          <div className="mt-4 pt-4 border-t border-gray-700 overflow-y-auto">
            <p className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2">Lobby Players</p>
            {selectedParty.members?.map((member: any) => member.user && (
              <div key={member.user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50">
                <Avatar user={member.user} className="h-7 w-7" />
                <Link to={member.user.id === currentUser?.id ? '/profile' : `/profile/${member.user.id}`} className="min-w-0 flex-1 text-sm text-white truncate hover:text-mf-primary">{member.user.displayName || member.user.username}</Link>
                {member.user.id !== currentUser?.id && <button onClick={() => setSafetyTarget(member.user)} className="text-xs text-gray-400 hover:text-red-300">Report / Block</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 glass-panel flex flex-col h-2/3 md:h-full">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {chatMode === 'direct' && selectedFriend && <Avatar user={selectedFriend} className="h-10 w-10" />}
            <div>
              <h3 className="font-bold text-white">{activeContact ? ('title' in activeContact ? activeContact.title : activeContact.displayName || activeContact.username) : chatMode === 'party' ? 'No party selected' : 'Select a friend'}</h3>
              <p className="text-xs text-gray-400">{chatMode === 'party' ? `${selectedParty?.members?.length || 0} Members` : selectedFriend?.username || 'Direct message'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-end gap-3 ${currentUser?.id === message.sender.id ? 'justify-end' : 'justify-start'}`}>
              {currentUser?.id !== message.sender.id && <Avatar user={message.sender} className="h-8 w-8" />}
              <div className={`max-w-[82%] ${currentUser?.id === message.sender.id ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-baseline gap-2 ${currentUser?.id === message.sender.id ? 'justify-end' : 'justify-start'}`}>
                  <Link to={currentUser?.id === message.sender.id ? '/profile' : `/profile/${message.sender.id}`} className="font-semibold text-mf-accent text-sm hover:underline">{currentUser?.id === message.sender.id ? 'You' : message.sender.displayName || message.sender.username}</Link>
                  <span className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`mt-1 p-3 rounded-2xl inline-block text-left break-words ${currentUser?.id === message.sender.id ? 'bg-mf-primary text-white rounded-tr-sm' : 'text-gray-300 bg-gray-800 rounded-tl-sm'}`}>{message.content}</p>
              </div>
              {currentUser?.id === message.sender.id && <Avatar user={currentUser} className="h-8 w-8" />}

              {safetyTarget && (
                <div className="fixed inset-0 z-[90] bg-black/75 flex items-center justify-center p-4" onMouseDown={event => { if (event.target === event.currentTarget) setSafetyTarget(null); }}>
                  <div className="glass-panel w-full max-w-md p-5">
                    <h3 className="text-lg font-bold text-white mb-1">Player safety</h3>
                    <p className="text-sm text-gray-400 mb-4">{safetyTarget.username}</p>
                    <label className="mb-3 block text-sm text-gray-300">เหตุผลในการรายงาน
                      <select value={reportCategory} onChange={event => setReportCategory(event.target.value as typeof reportCategory)} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white">
                        <option value="PROFANITY">พิมพ์คำหยาบ</option>
                        <option value="TOXIC">พฤติกรรม Toxic</option>
                        <option value="AFK">AFK / ไม่เล่นตามเกม</option>
                        <option value="DISRUPTION">ก่อกวน</option>
                        <option value="HARASSMENT">คุกคาม</option>
                      </select>
                    </label>
                    <textarea value={reportReason} onChange={event => setReportReason(event.target.value)} maxLength={1000} placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" className="mb-3 min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white" />
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => void submitSafety('reports')} className="border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 py-2.5 rounded-lg">Report</button>
                      <button onClick={() => void submitSafety('blocks')} className="border border-red-500/40 bg-red-500/10 text-red-300 py-2.5 rounded-lg">Block</button>
                    </div>
                    {safetyStatus && <p className="text-sm text-gray-300 mt-3">{safetyStatus}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
          {!messages.length && canSendMessage && <p className="text-center text-gray-500 py-10">No messages yet.</p>}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl">
          {isChatMuted && (
            <div role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              ระงับการแชททุกห้องถึง {new Date(mutedUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ใช้ได้ทั้งแชทปาร์ตี้และแชทส่วนตัว
            </div>
          )}
          {!isChatMuted && chatWarnings > 0 && (
            <div role="status" className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              คำเตือนการใช้คำหยาบ {chatWarnings}/3 — ข้อความที่มีคำหยาบจะไม่ถูกส่ง
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }}
              disabled={!canSendMessage || isChatMuted}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-mf-primary focus:ring-1 focus:ring-mf-primary"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!canSendMessage || isChatMuted || !content.trim()}
              className="p-3 bg-mf-primary hover:bg-mf-primary/80 rounded-xl text-white transition-colors flex-shrink-0 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ user, className }: { user: ChatUser; className: string }) {
  const label = user.displayName || user.username;
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={`${label} Discord avatar`} className={`${className} flex-shrink-0 rounded-full object-cover ring-1 ring-black/10`} />;
  }

  return <div aria-label={`${label} avatar`} className={`${className} flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-800 text-xs font-bold text-white`}>
    {label.slice(0, 2).toUpperCase()}
  </div>;
}
