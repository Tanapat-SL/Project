import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { io } from 'socket.io-client';
import { apiClient } from '../api/client';

type Party = {
  id: number;
  title: string;
  game?: { name: string };
  members?: Array<{ user?: { id: number; username: string } }>;
};

type ChatMessage = {
  id: number;
  content: string;
  createdAt: string;
  partyId?: number;
  sender: { id: number; username: string };
};

const socket = io();

export default function ChatView() {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [chatMode, setChatMode] = useState<'party' | 'direct'>('party');
  const [safetyTarget, setSafetyTarget] = useState<any>(null);
  const [reportReason, setReportReason] = useState('');
  const [safetyStatus, setSafetyStatus] = useState('');

  useEffect(() => {
    apiClient.get('/parties/mine').then(({ data }) => {
      setParties(data);
      setSelectedParty(data[0] || null);
    }).catch(() => setParties([]));
    apiClient.get('/friends').then(({ data }) => setFriends(data)).catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    if (!selectedFriend || chatMode !== 'direct') return;
    apiClient.get(`/chat/direct/${selectedFriend.id}`).then(({ data }) => setMessages(data)).catch(() => setMessages([]));
    const receiveMessage = (message: ChatMessage) => {
      if (!message.partyId) setMessages((current) => current.some(item => item.id === message.id) ? current : [...current, message]);
    };
    socket.on('receive_direct_message', receiveMessage);
    return () => {
      socket.off('receive_direct_message', receiveMessage);
    };
  }, [selectedFriend, chatMode]);

  useEffect(() => {
    if (chatMode !== 'party') return;
    if (!selectedParty) return;

    apiClient.get(`/chat/party/${selectedParty.id}`)
      .then(({ data }) => setMessages(data))
      .catch(() => setMessages([]));

    socket.emit('join_party_room', selectedParty.id);
    const receiveMessage = (message: ChatMessage) => {
      if (message.partyId === selectedParty.id) {
        setMessages((current) => current.some((item) => item.id === message.id)
          ? current
          : [...current, message]);
      }
    };
    socket.on('receive_party_message', receiveMessage);

    return () => {
      socket.off('receive_party_message', receiveMessage);
    };
  }, [selectedParty]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (chatMode === 'direct') {
      if (!selectedFriend || !content.trim()) return;
      const messageText = content.trim();
      setContent('');
      const { data } = await apiClient.post(`/chat/direct/${selectedFriend.id}`, { content: messageText });
      setMessages(current => [...current, data]);
      socket.emit('send_direct_message', { receiverId: selectedFriend.id, ...data });
      return;
    }
    if (!selectedParty || !content.trim()) return;
    const messageText = content.trim();
    setContent('');
    const { data } = await apiClient.post(`/chat/party/${selectedParty.id}`, { content: messageText });
    setMessages((current) => [...current.filter((message) => message.id !== data.id), data]);
    socket.emit('send_party_message', { partyId: selectedParty.id, ...data });
  };

  const submitSafety = async (action: 'reports' | 'blocks') => {
    if (!safetyTarget) return;
    try {
      await apiClient.post(`/${action}`, action === 'reports'
        ? { targetUserId: safetyTarget.id, reason: reportReason.trim() || 'Inappropriate behavior' }
        : { userId: safetyTarget.id });
      setSafetyStatus(action === 'reports' ? 'Report submitted.' : 'Player blocked.');
      setSafetyTarget(null);
      setReportReason('');
    } catch (error: any) {
      setSafetyStatus(error.response?.data?.message || 'Unable to submit safety action.');
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 max-w-6xl mx-auto animate-in fade-in duration-500">
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
              <button key={friend.id} onClick={() => setSelectedFriend(friend)} className={`w-full text-left p-3 rounded-xl ${selectedFriend?.id === friend.id ? 'bg-mf-primary/10 border border-mf-primary/20' : 'hover:bg-gray-800/50'}`}>
                <span className="font-semibold text-white">{friend.displayName || friend.username}</span>
              </button>
            ))}
          </div>
        )}
        {chatMode === 'party' && selectedParty && (
          <div className="mt-4 pt-4 border-t border-gray-700 overflow-y-auto">
            <p className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2">Lobby Players</p>
            {selectedParty.members?.map((member: any) => member.user && (
              <div key={member.user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50">
                <span className="text-sm text-white truncate">{member.user.username}</span>
                <button onClick={() => setSafetyTarget(member.user)} className="text-xs text-gray-400 hover:text-red-300">Report / Block</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 glass-panel flex flex-col h-2/3 md:h-full">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 rounded-t-2xl">
          <h3 className="font-bold text-white">{selectedParty?.title || 'No party selected'}</h3>
          <p className="text-xs text-gray-400">{selectedParty?.members?.length || 0} Members</p>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                {message.sender.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-mf-accent text-sm">{message.sender.username}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-gray-300 mt-1 bg-gray-800 p-3 rounded-2xl rounded-tl-sm inline-block">{message.content}</p>
              </div>

              {safetyTarget && (
                <div className="fixed inset-0 z-[90] bg-black/75 flex items-center justify-center p-4" onMouseDown={event => { if (event.target === event.currentTarget) setSafetyTarget(null); }}>
                  <div className="glass-panel w-full max-w-md p-5">
                    <h3 className="text-lg font-bold text-white mb-1">Player safety</h3>
                    <p className="text-sm text-gray-400 mb-4">{safetyTarget.username}</p>
                    <textarea value={reportReason} onChange={event => setReportReason(event.target.value)} maxLength={1000} placeholder="Reason for report (optional for block)" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-24 text-white mb-3" />
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
          {!messages.length && selectedParty && <p className="text-center text-gray-500 py-10">No messages yet.</p>}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void sendMessage(); }}
              disabled={!selectedParty}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-mf-primary focus:ring-1 focus:ring-mf-primary"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!selectedParty || !content.trim()}
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
