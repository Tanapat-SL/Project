import React, { useEffect, useState } from 'react';
import { Users, Mic, Plus, ChevronRight, X, Sparkles, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { apiClient } from '../api/client';

const socket = io();

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
  const [aiQuery, setAiQuery] = useState('');
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

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
        image: party.game.imageUrl || '',
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

  const runAiMatch = async (event: React.FormEvent) => {
    event.preventDefault();
    setAiLoading(true);
    try {
      const { data } = await apiClient.post('/ai/match-search', { query: aiQuery });
      setAiMatches(data.matches || []);
    } catch {
      setAiMatches([]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">LFG Board</h2>
          <p className="text-gray-400">Find your perfect squad and rank up together.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-gradient-to-r from-mf-primary to-mf-secondary hover:opacity-90 px-6 py-3 rounded-xl font-semibold text-white shadow-lg shadow-mf-primary/20 transition-all">
          <Plus className="w-5 h-5" /> Create Party
        </button>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <select value={game} onChange={(event) => { const nextGame = event.target.value; setGame(nextGame); setRank(''); loadParties(nextGame, region, ''); }} className="bg-mf-card border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-mf-primary">
          <option value="">All Games</option>
          {games.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
        <select value={rank} onChange={event => { const nextRank = event.target.value; setRank(nextRank); loadParties(game, region, nextRank); }} className="bg-mf-card border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-mf-primary">
          <option value="">Any Rank</option>
          {(games.find(item => item.name === game)?.ranks || []).map((item: string) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={region} onChange={event => { const nextRegion = event.target.value; setRegion(nextRegion); loadParties(game, nextRegion, rank); }} className="bg-mf-card border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-mf-primary">
          <option value="">Any Region</option>
          {['Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East', 'Africa'].map(item => <option key={item}>{item}</option>)}
        </select>
      </div>

      <form onSubmit={runAiMatch} className="glass-panel p-4 mb-8 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 text-mf-primary shrink-0"><Sparkles className="w-5 h-5" /><span className="font-semibold text-white">AI Party Helper</span></div>
        <input value={aiQuery} onChange={event => setAiQuery(event.target.value)} required placeholder="Find a Valorant party with a chill team and mic..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-mf-primary" />
        <button disabled={aiLoading} className="bg-mf-primary px-4 py-2 rounded-lg text-white flex items-center justify-center gap-2 disabled:opacity-60"><Search className="w-4 h-4" />{aiLoading ? 'Finding...' : 'Find Party'}</button>
      </form>
      {aiMatches.length > 0 && (
        <div className="glass-panel p-4 mb-8 grid gap-3">
          {aiMatches.map(match => (
            <button key={match.partyId || match.id} onClick={() => navigate(`/party/${match.partyId || match.id}`)} className="flex items-center justify-between gap-4 bg-gray-900/60 border border-gray-700 hover:border-mf-primary/50 rounded-lg p-4 text-left">
              <div><p className="font-bold text-white">{match.username}</p><p className="text-sm text-gray-400">{match.reasons?.join(' · ')}</p></div>
              <span className="text-mf-primary font-bold">{match.compatibilityScore}%</span>
            </button>
          ))}
        </div>
      )}

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
