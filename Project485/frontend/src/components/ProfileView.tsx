import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Shield, Gamepad2, Edit3, X, Save, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';

type GameProfile = {
  gameId: number;
  rank: string;
  platform: string;
  playStyle: string;
  micEnabled: boolean;
  game?: { id: number; name: string; slug: string; ranks?: string[] };
};

type GameOption = { id: number; name: string; slug: string; ranks?: string[] };

const playStyles = [
  { value: 'COMPETITIVE', label: 'Competitive' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'CHILL', label: 'Chill' },
  { value: 'LEARNING', label: 'Learning' },
];

const platforms = [
  { value: 'PC', label: 'PC' },
  { value: 'PLAYSTATION', label: 'PlayStation' },
  { value: 'XBOX', label: 'Xbox' },
  { value: 'SWITCH', label: 'Switch' },
  { value: 'MOBILE', label: 'Mobile' },
];

export default function ProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isOwnProfile = !userId;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableGames, setAvailableGames] = useState<GameOption[]>([]);
  const [profile, setProfile] = useState<any>({ languages: [], games: [] });
  const [gameDrafts, setGameDrafts] = useState<GameProfile[]>([]);
  const [newGameId, setNewGameId] = useState('');

  const loadProfile = async () => {
    if (userId) {
      const { data: user } = await apiClient.get(`/users/${userId}`);
      setProfile(user);
      setGameDrafts([]);
      return;
    }
    const [{ data: user }, { data: games }] = await Promise.all([
      apiClient.get('/auth/me'),
      apiClient.get('/games'),
    ]);
    setProfile(user);
    setAvailableGames(games);
    setGameDrafts((user.games || []).map((item: any) => ({
      gameId: item.game.id,
      game: item.game,
      rank: item.game.ranks?.includes(item.rank) ? item.rank : '',
      platform: item.platform || 'PC',
      playStyle: item.playStyle || 'CASUAL',
      micEnabled: item.micEnabled !== false,
    })));
  };

  useEffect(() => {
    if (!userId && !localStorage.getItem('mf_token')) return;
    loadProfile().catch(() => undefined);
  }, [userId]);

  const startEditing = () => {
    setGameDrafts((profile.games || []).map((item: any) => ({
      gameId: item.game.id,
      game: item.game,
      rank: item.game.ranks?.includes(item.rank) ? item.rank : '',
      platform: item.platform || 'PC',
      playStyle: item.playStyle || 'CASUAL',
      micEnabled: item.micEnabled !== false,
    })));
    setEditing(true);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch('/users/me', {
        bio: profile.bio || '',
        languages: profile.languages || [],
        timezone: profile.timezone || 'Asia/Bangkok',
        contact: profile.contact || '',
      });
      await apiClient.put('/users/me/games', {
        games: gameDrafts.map(({ gameId, rank, platform, playStyle, micEnabled }) => ({
          gameId, rank, platform, playStyle, micEnabled,
        })),
      });
      await loadProfile();
      setEditing(false);
    } catch {
      alert('บันทึกไม่สำเร็จ กรุณาลองเข้าสู่ระบบใหม่หรือตรวจสอบข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const addGame = () => {
    const game = availableGames.find(item => item.id === Number(newGameId));
    if (!game || gameDrafts.some(item => item.gameId === game.id)) return;
    setGameDrafts(current => [...current, {
      gameId: game.id,
      game,
      rank: '',
      platform: 'PC',
      playStyle: 'CASUAL',
      micEnabled: true,
    }]);
    setNewGameId('');
  };

  const updateGame = (gameId: number, patch: Partial<GameProfile>) => {
    setGameDrafts(current => current.map(item => item.gameId === gameId ? { ...item, ...patch } : item));
  };

  const styleLabel = (value: string) => playStyles.find(style => style.value === value)?.label || value;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      {!isOwnProfile && <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500 hover:text-mf-primary">← Back</button>}
      <div className="glass-panel p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-mf-primary/20 to-mf-secondary/20 border-b border-gray-800"></div>
        <div className="relative pt-16 flex flex-col md:flex-row gap-6 items-start md:items-end">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-mf-primary to-mf-secondary p-1">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full border-4 border-mf-card object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center border-4 border-mf-card">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">{profile.displayName || profile.username || 'My Profile'}</h1>
            <p className="text-gray-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</p>
          </div>
          {isOwnProfile && <button onClick={startEditing} className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">About Me</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{profile.bio || 'No bio yet.'}</p>
            <div className="mt-6 space-y-4">
              <div><span className="text-xs text-gray-500 uppercase font-semibold">Playstyle</span><p className="text-white">{profile.games?.length ? [...new Set(profile.games.map((item: any) => styleLabel(item.playStyle)))].join(' / ') : 'Not set'}</p></div>
              <div><span className="text-xs text-gray-500 uppercase font-semibold">Discord</span><p className="text-mf-primary font-medium break-all">{profile.username || 'Unknown Discord user'}</p></div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2 flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-mf-primary" /> Game Profiles</h3>
            <div className="space-y-4">
              {(profile.games || []).length === 0 && <p className="text-sm text-gray-400">ยังไม่มีโปรไฟล์เกม กด Edit Profile เพื่อเพิ่มเกม</p>}
              {(profile.games || []).map((item: any) => (
                <div key={item.game.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-mf-primary/20 rounded-lg flex items-center justify-center text-mf-primary font-bold border border-mf-primary/30">{item.game.name.slice(0, 3).toUpperCase()}</div>
                    <div><h4 className="font-bold text-white">{item.game.name}</h4><p className="text-sm text-gray-400">{styleLabel(item.playStyle)} · {platforms.find(platform => platform.value === item.platform)?.label || item.platform}</p></div>
                  </div>
                  <div className="text-center sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-gray-700 pt-3 sm:pt-0">
                    <div className="flex items-center justify-center sm:justify-end gap-2 mb-1"><Shield className="w-4 h-4 text-purple-400" /><span className="font-bold text-white">{item.rank || 'Rank not set'}</span></div>
                    <p className="text-xs text-gray-500">{item.micEnabled ? 'Mic enabled' : 'Mic disabled'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={saveProfile} className="glass-panel w-full max-w-2xl p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center"><h3 className="text-xl font-bold text-white">Edit Profile</h3><button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-white"><X /></button></div>
            <label className="block text-sm text-gray-400">Discord username<input readOnly value={profile.username || ''} className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-400 outline-none cursor-not-allowed" /></label>
            <label className="block text-sm text-gray-400">Bio<textarea maxLength={500} value={profile.bio || ''} onChange={event => setProfile({ ...profile, bio: event.target.value })} className="mt-2 w-full min-h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" /></label>
            <label className="block text-sm text-gray-400">Languages (comma-separated)<input value={(profile.languages || []).join(', ')} onChange={event => setProfile({ ...profile, languages: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" /></label>
            <label className="block text-sm text-gray-400">Timezone<input value={profile.timezone || ''} onChange={event => setProfile({ ...profile, timezone: event.target.value })} className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" /></label>
            <label className="block text-sm text-gray-400">Contact<input maxLength={200} value={profile.contact || ''} onChange={event => setProfile({ ...profile, contact: event.target.value })} placeholder="Discord, email, or social handle" className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" /></label>

            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h4 className="font-semibold text-white">Game profiles</h4>
              <div className="flex gap-2"><select value={newGameId} onChange={event => setNewGameId(event.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"><option value="">Select a game to add</option>{availableGames.filter(game => !gameDrafts.some(item => item.gameId === game.id)).map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select><button type="button" onClick={addGame} disabled={!newGameId} className="px-4 rounded-lg bg-mf-primary text-white disabled:opacity-50"><Plus className="w-5 h-5" /></button></div>
              {gameDrafts.map(game => (
                <div key={game.gameId} className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3">
                  <div className="flex items-center justify-between"><span className="font-semibold text-white">{game.game?.name}</span><button type="button" onClick={() => setGameDrafts(current => current.filter(item => item.gameId !== game.gameId))} aria-label={`Remove ${game.game?.name}`} className="text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs text-gray-400">Rank<select value={game.rank} onChange={event => updateGame(game.gameId, { rank: event.target.value })} className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white"><option value="">No rank selected</option>{(game.game?.ranks || []).map(rank => <option key={rank} value={rank}>{rank}</option>)}</select></label>
                    <label className="text-xs text-gray-400">Playstyle<select value={game.playStyle} onChange={event => updateGame(game.gameId, { playStyle: event.target.value })} className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white">{playStyles.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}</select></label>
                    <label className="text-xs text-gray-400">Platform<select value={game.platform} onChange={event => updateGame(game.gameId, { platform: event.target.value })} className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white">{platforms.map(platform => <option key={platform.value} value={platform.value}>{platform.label}</option>)}</select></label>
                    <label className="flex items-center gap-2 text-sm text-gray-300 self-end pb-2"><input type="checkbox" checked={game.micEnabled} onChange={event => updateGame(game.gameId, { micEnabled: event.target.checked })} className="accent-mf-primary" /> Mic enabled</label>
                  </div>
                </div>
              ))}
            </div>
            <button disabled={saving} className="w-full bg-mf-primary hover:bg-mf-primary/80 py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
