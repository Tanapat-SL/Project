import React, { useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function MatchmakerView() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await apiClient.post('/ai/match-search', { query });
      setMatches(data.matches);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="glass-panel p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-mf-primary" />
          <h2 className="text-3xl font-bold text-white">AI Matchmaker</h2>
        </div>
        <p className="text-gray-400 mb-6">Describe the teammates you want and MATCHFOUND will match compatible players.</p>
        <form onSubmit={search} className="flex gap-3">
          <input value={query} onChange={e => setQuery(e.target.value)} maxLength={500} required placeholder="Find Valorant Gold teammates, Thai speakers, after 20:00 with mic..." className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-mf-primary outline-none" />
          <button disabled={loading} className="bg-mf-primary px-5 rounded-xl text-white font-semibold flex items-center gap-2"><Search className="w-4 h-4" />{loading ? 'Finding...' : 'Find'}</button>
        </form>
      </div>
      <div className="space-y-4">
        {matches.map((match, index) => (
          <div key={match.id || index} className="glass-panel p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white">{match.username}</h3>
              <p className="text-sm text-gray-400">{match.reasons?.join(' · ')}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-mf-primary">{match.compatibilityScore}%</div>
              <div className="text-xs text-gray-500">Compatibility</div>
              {match.partyId && (
                <button onClick={() => navigate(`/party/${match.partyId}`)} className="mt-3 bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg text-white text-sm">Open Party</button>
              )}
            </div>
          </div>
        ))}
        {!matches.length && <p className="text-center text-gray-500 py-10">Enter a request to see player recommendations.</p>}
      </div>
    </div>
  );
}
