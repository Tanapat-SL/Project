import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { apiClient } from '../api/client';

export default function NotificationsView() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    try {
      const { data } = await apiClient.get('/notifications');
      setItems(data);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => { void load(); }, []);

  const markRead = async (id: number) => {
    await apiClient.patch(`/notifications/${id}/read`);
    await load();
  };

  const acceptFriend = async (item: any) => {
    const requestId = item.payload?.requestId;
    if (!requestId) return;
    await apiClient.patch(`/friends/requests/${requestId}`, { status: 'ACCEPTED' });
    await markRead(item.id);
  };

  const reviewPartyRequest = async (item: any, status: 'ACCEPTED' | 'REJECTED') => {
    await apiClient.patch(`/parties/${item.payload.partyId}/members/${item.payload.requesterId}`, { status });
    await markRead(item.id);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="glass-panel p-6 mb-6 flex items-center gap-3">
        <Bell className="text-mf-primary" />
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
      </div>
      {!items.length && <p className="text-center text-gray-500 py-10">No notifications yet.</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className={`glass-panel p-4 flex items-center justify-between gap-4 ${item.readAt ? 'opacity-70' : 'border-mf-primary/30'}`}>
            <div>
              <p className="font-semibold text-white">{item.type.replaceAll('_', ' ')}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            {!item.readAt && (
              <div className="flex gap-2">
                {item.type === 'FRIEND_REQUEST' && (
                  <button onClick={() => void acceptFriend(item)} className="bg-mf-primary px-3 py-2 rounded-lg text-white text-sm">Accept Friend</button>
                )}
                {item.type === 'PARTY_JOIN_REQUEST' && (
                  <>
                    <button onClick={() => void reviewPartyRequest(item, 'ACCEPTED')} className="bg-green-500/20 border border-green-500/30 text-green-300 px-3 py-2 rounded-lg text-sm">Accept</button>
                    <button onClick={() => void reviewPartyRequest(item, 'REJECTED')} className="bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm">Reject</button>
                  </>
                )}
                <button onClick={() => void markRead(item.id)} className="text-mf-primary hover:text-white flex items-center gap-1 text-sm">
                  <CheckCheck className="w-4 h-4" /> Read
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
