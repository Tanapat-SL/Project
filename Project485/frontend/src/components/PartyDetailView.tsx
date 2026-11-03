import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Mic, ArrowLeft, Send } from 'lucide-react';

export default function PartyDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data based on ID (in real app, fetch from backend)
  const party = { 
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
                {party.members.map((m, i) => (
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
                <button className="w-full bg-gradient-to-r from-mf-primary to-mf-secondary hover:opacity-90 py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Join Request
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
