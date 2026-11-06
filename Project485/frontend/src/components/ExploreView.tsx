import React, { useEffect, useState } from 'react';
import { Users, Mic, Plus, ChevronRight, X, Search, Radio, Trophy, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { socket } from '../api/socket';
import { getGameArtwork } from '../utils/game-artwork';

export default function ExploreView() {
  const navigate = useNavigate();
  const [parties, setParties] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [game, setGame] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rank, setRank] = useState('');
  const [region, setRegion] = useState('');
  const [form, setForm] = useState({ gameId: '', title: '', description: '', rankMin: '', rankMax: '', maxMembers: 5, micRequired: true, region: 'Asia' });
  const createGameRanks: string[] = games.find(item => item.id === Number(form.gameId))?.ranks || [];

  const loadParties = async (selectedGame = '', selectedRegion = region, selectedRank = rank) => {
    try {
      const { data } = await apiClient.get('/parties', { params: { ...(selectedGame ? { game: selectedGame } : {}), ...(selectedRegion ? { region: selectedRegion } : {}), ...(selectedRank ? { rank: selectedRank } : {}) } });
      setParties(data.map((party: any) => ({
        id: party.id,
        game: party.game.name,
        title: party.title,
        current: (party.members?.filter((member: any) => member.status === 'ACCEPTED').length || 0) || 1,
        max: party.maxMembers,
        owner: party.owner.username,
        roleNeeded: party.mode || 'Any role',
        rankReq: [party.rankMin, party.rankMax].filter(Boolean).join(' - ') || 'Any rank',
        voice: party.micRequired,
        image: party.game.imageUrl || getGameArtwork(party.game.name),
      })));
    } catch {
      setParties([]);
    }
  };

  useEffect(() => {
    loadParties();
    apiClient.get('/games').then(({ data }) => setGames(data)).catch(() => undefined);
    const refreshParties = () => loadParties(game);
    socket.on('party_created', refreshParties);
    socket.on('party_updated', refreshParties);
    socket.on('party_deleted', refreshParties);
    return () => {
      socket.off('party_created', refreshParties);
      socket.off('party_updated', refreshParties);
      socket.off('party_deleted', refreshParties);
    };
  }, []);

  const createParty = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      await apiClient.post('/parties', form);
      setForm({ gameId: '', title: '', description: '', rankMin: '', rankMax: '', maxMembers: 5, micRequired: true, region: 'Asia' });
      setShowCreate(false);
      await loadParties(game);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Please sign in with Discord before creating a party.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] animate-in fade-in duration-500 pb-20">
      <section className="relative mb-6 min-h-[230px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#171b26] shadow-2xl shadow-black/30">
        <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=85" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#11151f] via-[#11151f]/85 to-[#11151f]/10" />
        <div className="absolute -right-16 top-0 h-full w-2/3 bg-gradient-to-l from-orange-500/25 via-transparent to-transparent" />
        <div className="relative flex min-h-[230px] flex-col justify-between gap-8 p-6 md:p-8">
          <div>
            <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#ff7549]">
              <span className="h-2 w-2 rounded-full bg-[#ff7549] shadow-[0_0_12px_#ff7549]" />
              Matchfound Dashboard
            </div>
            <h2 className="explore-hero-title max-w-xl text-3xl font-black leading-tight text-white md:text-5xl">Find your squad.<br />Own the game.</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-gray-300 md:text-base">ค้นหาทีม เล่นเกม และพบเพื่อนที่ตรงกับสไตล์การเล่นของคุณ</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="absolute bottom-7 right-7 flex items-center gap-2 rounded-xl bg-[#ff6035] px-5 py-3 font-bold text-white shadow-xl shadow-orange-950/40 transition hover:-translate-y-0.5 hover:bg-[#ff754f]">
            <Plus className="h-5 w-5" /> สร้างห้องเล่น
          </button>
        </div>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {games.map((item) => (
          <button key={item.id} onClick={() => { setGame(item.name); setRank(''); loadParties(item.name, region, ''); }} className={`relative h-28 overflow-hidden rounded-2xl border text-left transition hover:-translate-y-1 ${game === item.name ? 'border-orange-400' : 'border-white/[0.08]'}`}>
            <img src={getGameArtwork(item.name)} alt={`${item.name} game artwork`} className="absolute inset-0 h-full w-full object-cover opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#11151f] via-[#11151f]/70 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-4">
              <span className="game-tile-name text-lg font-bold text-white">{item.name}</span>
              <span className="game-tile-caption mt-1 text-xs text-gray-300">Browse parties</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.07] bg-[#141924] p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <select value={game} onChange={(event) => { const nextGame = event.target.value; setGame(nextGame); setRank(''); loadParties(nextGame, region, ''); }} className="bg-[#1d2230] border border-white/[0.08] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500">
          <option value="">All Games</option>
          {games.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
        <select value={rank} onChange={event => { const nextRank = event.target.value; setRank(nextRank); loadParties(game, region, nextRank); }} className="bg-[#1d2230] border border-white/[0.08] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500">
          <option value="">Any Rank</option>
          {(games.find(item => item.name === game)?.ranks || []).map((item: string) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={region} onChange={event => { const nextRegion = event.target.value; setRegion(nextRegion); loadParties(game, nextRegion, rank); }} className="bg-[#1d2230] border border-white/[0.08] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500">
          <option value="">Any Region</option>
          {['Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East', 'Africa'].map(item => <option key={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => { setGame(''); setRank(''); setRegion(''); loadParties('', '', ''); }} className="filter-clear rounded-xl px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/[0.05] hover:text-white">Clear</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {parties.map(party => (
          <div key={party.id} className="glass-panel overflow-hidden group hover:border-gray-600 transition-colors flex flex-col h-full">
            <div className="h-32 bg-gradient-to-br from-mf-primary/30 to-mf-secondary/30 relative overflow-hidden flex-shrink-0">
              {party.image && <img src={party.image} alt={party.game} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />}
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-semibold border border-white/10">{party.game}</div>
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-3 py-1 text-xs border border-white/10">
                <Users className="w-3 h-3 text-mf-primary" /><span>{party.current}/{party.max}</span>
              </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-white mb-1 truncate">{party.title}</h3>
              <p className="text-sm text-gray-400 mb-4">Created by <span className="text-mf-accent font-medium">{party.owner}</span></p>
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-300">Need: <span className="text-white font-medium">{party.roleNeeded}</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-300">Rank: <span className="text-white font-medium">{party.rankReq}</span></div>
                <div className={`flex items-center gap-2 text-sm ${party.voice ? 'text-gray-300' : 'text-gray-500'}`}>
                  <Mic className={`w-4 h-4 ${party.voice ? 'text-green-400' : 'opacity-50'}`} />
                  {party.voice ? 'Mic Required' : 'Mic Optional'}
                </div>
              </div>
              <button onClick={() => navigate('/party/' + party.id)} className="mt-auto w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 group-hover:border-mf-primary/50 group-hover:text-mf-primary">
                View Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {parties.length === 0 && (
        <div className="glass-panel mt-6 p-10 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-500" />
          <p className="text-white font-semibold">No active parties</p>
          <p className="text-gray-400 text-sm mt-1">Create the first party for this game.</p>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[80] bg-black/75 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <form onSubmit={createParty} className="glass-panel w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Create Party</h3>
              <button type="button" aria-label="Close" onClick={() => setShowCreate(false)}><X /></button>
            </div>
            <select required value={form.gameId} onChange={e => setForm({ ...form, gameId: e.target.value, rankMin: '', rankMax: '' })} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white">
              <option value="">Select game</option>
              {games.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input required maxLength={100} placeholder="Party title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-400">Minimum rank
                <select value={form.rankMin} onChange={e => setForm({ ...form, rankMin: e.target.value })} disabled={!form.gameId} className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white disabled:opacity-50">
                  <option value="">Any rank</option>
                  {createGameRanks.filter(item => !form.rankMax || createGameRanks.indexOf(item) <= createGameRanks.indexOf(form.rankMax)).map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-400">Maximum rank
                <select value={form.rankMax} onChange={e => setForm({ ...form, rankMax: e.target.value })} disabled={!form.gameId} className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white disabled:opacity-50">
                  <option value="">Any rank</option>
                  {createGameRanks.filter(item => !form.rankMin || createGameRanks.indexOf(item) >= createGameRanks.indexOf(form.rankMin)).map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white">
              {['Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East', 'Africa'].map(item => <option key={item}>{item}</option>)}
            </select>
            <textarea maxLength={1000} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white min-h-28" />
            <div className="flex items-center justify-between">
              <label className="text-gray-300">Maximum members</label>
              <input type="number" min="2" max="20" value={form.maxMembers} onChange={e => setForm({ ...form, maxMembers: Number(e.target.value) })} className="w-24 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white" />
            </div>
            <label className="flex gap-2 text-gray-300"><input type="checkbox" checked={form.micRequired} onChange={e => setForm({ ...form, micRequired: e.target.checked })} /> Mic required</label>
            <button type="submit" disabled={creating} className="w-full bg-mf-primary hover:bg-mf-primary/80 py-3 rounded-lg font-bold text-white disabled:opacity-60">{creating ? 'Creating...' : 'Create Party'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
