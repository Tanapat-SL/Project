import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Mic, ArrowLeft, Send } from 'lucide-react';
import { apiClient } from '../api/client';

export default function PartyDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partyData, setPartyData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [joinStatus, setJoinStatus] = useState<'NONE' | 'PENDING' | 'ACCEPTED'>('NONE');
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/parties/${id}`).then(({ data }) => setPartyData(data)).catch(() => undefined);
    apiClient.get('/auth/me').then(({ data }) => setCurrentUser(data)).catch(() => undefined);
    const loadMembership = async () => {
      try {
        const { data } = await apiClient.get('/parties/mine');
        if (data.some((party: any) => party.id === Number(id))) setJoinStatus('ACCEPTED');
      } catch {
        setJoinStatus('NONE');
      }
    };
    void loadMembership();
  }, [id]);

  useEffect(() => {
    if (!partyData || currentUser?.id !== partyData.owner?.id) return;
    apiClient.get(`/parties/${id}/join-requests`)
      .then(({ data }) => setJoinRequests(data))
      .catch(() => setJoinRequests([]));
  }, [partyData, currentUser, id]);

  const joinParty = async () => {
    if (!currentUser) {
      setStatus('Please login with Discord before sending a join request.');
      return;
    }
    try {
      await apiClient.post(`/parties/${id}/join-requests`, { message: 'I would like to join this party.' });
      setJoinStatus('PENDING');
      setStatus('Join request sent to the party owner.');
    } catch {
      setStatus('Please login before sending a join request.');
    }
  };

  const reviewJoinRequest = async (requesterId: number, status: 'ACCEPTED' | 'REJECTED') => {
    await apiClient.patch(`/parties/${id}/members/${requesterId}`, { status });
    setJoinRequests((current) => current.filter((request) => request.userId !== requesterId));
    const { data } = await apiClient.get(`/parties/${id}`);
    setPartyData(data);
  };

  // Mock data based on ID (in real app, fetch from backend)
  const mockParty = { 
    id, 
    game: 'Valorant', 
    title: 'LF2M Ranked Push (Immortal+)', 
    current: 3, 
    max: 5, 
    owner: 'JettMain99', 
    roleNeeded: 'Controller/Sentinel', 
    voice: true, 
    image: 'https://images.unsplash.com/photo-1623934199716-dc28818a6ec7?q=80&w=1200&auto=format&fit=crop',
    description: "Looking for 2 more chill people to push rank tonight. We usually play passive on defense and explosive on attack. Please have a working mic and be willing to comm. Don't be toxic.",
    rankReq: 'Immortal 1+',
    members: [
      { name: 'JettMain99', role: 'Duelist', isOwner: true },
      { name: 'SovaLineupTTV', role: 'Initiator', isOwner: false },
      { name: 'OmenSmurf', role: 'Flex', isOwner: false },
    ]
  };

  const party = partyData ? {
    id: partyData.id,
    game: partyData.game?.name || mockParty.game,
    title: partyData.title || mockParty.title,
    current: partyData.members?.filter((member: any) => member.status === 'ACCEPTED').length || 1,
    max: partyData.maxMembers,
    owner: partyData.owner?.username || mockParty.owner,
    ownerId: partyData.owner?.id,
    roleNeeded: partyData.mode || mockParty.roleNeeded,
    voice: partyData.micRequired,
    image: mockParty.image,
    description: partyData.description || mockParty.description,
    rankReq: partyData.rankMin && partyData.rankMax
      ? `${partyData.rankMin} - ${partyData.rankMax}`
      : partyData.rankMin ? `${partyData.rankMin}+` : partyData.rankMax ? `Up to ${partyData.rankMax}` : 'Any rank',
    members: partyData.members?.filter((member: any) => member.status === 'ACCEPTED').map((member: any) => ({
      name: member.user?.username || 'Player',
      role: member.role === 'OWNER' ? 'Leader' : 'Member',
      isOwner: member.role === 'OWNER',
    })) || mockParty.members,
  } : mockParty;

  const deleteParty = async () => {
    if (!window.confirm('Delete this party permanently?')) return;
    try {
      await apiClient.delete(`/parties/${id}`);
      navigate('/');
    } catch {
      setStatus('Only the party owner can delete this party.');
    }
  };

  const sendFriendRequest = async () => {
    if (!partyData?.owner?.id || partyData.owner.id === currentUser?.id) return;
    try {
      await apiClient.post('/friends/requests', { userId: partyData.owner.id });
      setStatus('Friend request sent.');
    } catch {
      setStatus('Could not send friend request.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Board
      </button>

      <div className="glass-panel overflow-hidden">
        {/* Banner */}
        <div className="h-64 relative">
          <img src={party.image} alt={party.game} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-mf-card to-transparent"></div>
          
          <div className="absolute bottom-6 left-6 right-6">
            <span className="px-3 py-1 bg-mf-primary/80 backdrop-blur-md rounded-full text-xs font-bold text-white mb-3 inline-block">
              {party.game}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{party.title}</h1>
            <p className="text-gray-300">Created by <span className="text-mf-accent font-semibold">{party.owner}</span></p>
          </div>
        </div>

        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
          {/* Main Info */}
          <div className="flex-1 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-800 pb-2">Party Details</h3>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{party.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-800 pb-2 flex items-center justify-between">
                <span>Current Roster ({party.current}/{party.max})</span>
              </h3>
              <div className="space-y-3">
                {party.members.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-white">{m.name} {m.isOwner && <span className="text-mf-primary text-xs ml-1">(Leader)</span>}</span>
                    </div>
                    <span className="text-sm text-gray-400">{m.role}</span>
                  </div>
                ))}
                
                {/* Empty Slots */}
                {[...Array(party.max - party.current)].map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center justify-between p-3 border border-dashed border-gray-700 rounded-lg opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-dashed border-gray-500"></div>
                      <span className="text-gray-500 italic">Open Slot</span>
                    </div>
                    <span className="text-sm text-mf-primary">{party.roleNeeded}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar / Join Panel */}
          <div className="w-full md:w-72 space-y-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <h4 className="font-bold text-white mb-4 text-center">Requirements</h4>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">Rank</span>
                  <span className="text-white font-medium">{party.rankReq}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">Role Needed</span>
                  <span className="text-white font-medium">{party.roleNeeded}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-gray-400">Comms</span>
                  {party.voice ? (
                     <span className="text-green-400 font-medium flex items-center gap-1"><Mic className="w-3 h-3"/> Mic Req</span>
                  ) : (
                     <span className="text-gray-400">Optional</span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700">
                {currentUser?.id === partyData?.owner?.id && (
                  <button onClick={() => void deleteParty()} className="w-full mb-3 border border-red-500/50 text-red-300 py-2.5 rounded-lg text-sm">Delete Party</button>
                )}
                {currentUser?.id !== partyData?.owner?.id && (
                  <button onClick={() => void sendFriendRequest()} className="w-full mb-3 border border-mf-primary/50 text-mf-primary py-2.5 rounded-lg text-sm">Add Friend</button>
                )}
                <button onClick={joinParty} disabled={!currentUser || joinStatus !== 'NONE' || currentUser?.id === partyData?.owner?.id} className="w-full bg-gradient-to-r from-mf-primary to-mf-secondary hover:opacity-90 py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4" />
                  {!currentUser ? 'Login to Request' : joinStatus === 'PENDING' ? 'Request Pending' : joinStatus === 'ACCEPTED' ? 'Joined' : 'Send Join Request'}
                </button>
                {status && <p className="text-xs text-gray-300 mt-3">{status}</p>}
                {currentUser?.id === partyData?.owner?.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm font-bold text-white mb-3">Join Requests ({joinRequests.length})</p>
                    {!joinRequests.length && <p className="text-xs text-gray-500">No pending requests.</p>}
                    {joinRequests.map(request => (
                      <div key={request.id} className="bg-gray-900/60 rounded-lg p-3 mb-2">
                        <p className="text-white text-sm font-semibold mb-2">{request.user.displayName || request.user.username}</p>
                        <p className="text-xs text-gray-400 mb-3">{request.message || 'Wants to join this party.'}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => void reviewJoinRequest(request.userId, 'ACCEPTED')} className="bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg py-2 text-xs">Accept</button>
                          <button onClick={() => void reviewJoinRequest(request.userId, 'REJECTED')} className="bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg py-2 text-xs">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
