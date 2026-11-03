import React from 'react';
import { Users, Mic, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockParties = [
  { id: 1, game: 'Valorant', title: 'LF2M Ranked Push (Immortal+)', current: 3, max: 5, owner: 'JettMain99', roleNeeded: 'Controller/Sentinel', voice: true, image: 'https://images.unsplash.com/photo-1623934199716-dc28818a6ec7?q=80&w=600&auto=format&fit=crop' },
  { id: 2, game: 'Apex Legends', title: 'Ranked Grind to Diamond', current: 2, max: 3, owner: 'WraithTTv', roleNeeded: 'Support', voice: true, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop' },
  { id: 3, game: 'CS2', title: 'Premier Mode 15k+ ELO', current: 4, max: 5, owner: 'AwpGod', roleNeeded: 'Rifler', voice: true, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop' },
  { id: 4, game: 'Overwatch 2', title: 'Quick Play Chill', current: 1, max: 5, owner: 'MercyMain', roleNeeded: 'Tank/DPS', voice: false, image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=600&auto=format&fit=crop' }
];

export default function ExploreView() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">LFG Board</h2>
          <p className="text-gray-400">Find your perfect squad and rank up together.</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-mf-primary to-mf-secondary hover:opacity-90 px-6 py-3 rounded-xl font-semibold shadow-lg shadow-mf-primary/20 transition-all">
          <Plus className="w-5 h-5" />
          Create Party
        </button>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <select className="bg-mf-card border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-mf-primary">
          <option>All Games</option>
          <option>Valorant</option>
          <option>Apex Legends</option>
          <option>CS2</option>
          <option>Overwatch 2</option>
        </select>
        <select className="bg-mf-card border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-mf-primary">
          <option>Any Rank</option>
          <option>High Tier (Diamond+)</option>
          <option>Mid Tier (Gold-Plat)</option>
        </select>
        <select className="bg-mf-card border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-mf-primary">
          <option>Any Region</option>
          <option>Asia (Singapore/Tokyo)</option>
          <option>NA</option>
          <option>EU</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockParties.map(party => (
          <div key={party.id} className="glass-panel overflow-hidden group hover:border-gray-600 transition-colors flex flex-col h-full">
            <div className="h-32 bg-gray-800 relative overflow-hidden flex-shrink-0">
              <img src={party.image} alt={party.game} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-semibold border border-white/10">
                {party.game}
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 text-xs border border-white/10">
                <Users className="w-3 h-3 text-mf-primary" />
                <span>{party.current}/{party.max}</span>
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-white mb-1 truncate">{party.title}</h3>
              <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                Created by <span className="text-mf-accent font-medium">{party.owner}</span>
              </p>
              
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-mf-primary"></div>
                  <span className="text-gray-300">Need: <span className="text-white font-medium">{party.roleNeeded}</span></span>
                </div>
                {party.voice ? (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Mic className="w-4 h-4 text-green-400" />
                    Mic Required
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                     <Mic className="w-4 h-4 opacity-50" />
                     Mic Optional
                  </div>
                )}
              </div>

              <button 
                onClick={() => navigate('/party/' + party.id)}
                className="mt-auto w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 group-hover:border-mf-primary/50 group-hover:text-mf-primary"
              >
                View Details
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
