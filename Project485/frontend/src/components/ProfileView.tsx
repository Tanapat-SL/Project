import React, { useEffect, useState } from 'react';
import { User, Shield, Gamepad2, Award, Edit3, X, Save } from 'lucide-react';
import { apiClient } from '../api/client';

export default function ProfileView() {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    username: 'GamerTag_XYZ',
    bio: 'Mainly playing FPS and MOBA games. Looking for chill people to rank up with in the evenings (Asia server).',
    languages: ['th', 'en'],
    timezone: 'Asia/Bangkok',
    games: [],
  });

  useEffect(() => {
    const token = localStorage.getItem('mf_token');
    if (!token) return;
    apiClient.get('/auth/me')
      .then(({ data }) => setProfile((current: any) => ({ ...current, ...data })))
      .catch(() => undefined);
  }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('mf_token');
      const { data } = await apiClient.patch('/users/me', {
        bio: profile.bio,
        languages: profile.languages,
        timezone: profile.timezone,
        contact: profile.contact,
      });
      setProfile((current: any) => ({ ...current, ...data }));
      setEditing(false);
    } catch {
      alert('เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธ”เนเธงเธข Discord เธเนเธญเธเนเธเนเนเธเนเธเธฃเนเธเธฅเน');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="glass-panel p-8 mb-6 relative overflow-hidden">
        {/* Banner */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-mf-primary/20 to-mf-secondary/20 border-b border-gray-800"></div>
        
        <div className="relative pt-16 flex flex-col md:flex-row gap-6 items-start md:items-end">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-mf-primary to-mf-secondary p-1">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Discord avatar" className="w-full h-full rounded-full border-4 border-mf-card object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center border-4 border-mf-card">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">{profile.displayName || profile.username}</h1>
            <p className="text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
            </p>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
            <button onClick={() => setEditing(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">About Me</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {profile.bio || 'No bio yet.'}
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Playstyle</span>
                <p className="text-white">Flex / Tryhard</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Discord</span>
                <p className="text-mf-primary font-medium break-all">{profile.username || 'Unknown Discord user'}</p>
              </div>

              {editing && (
                <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
                  <form onSubmit={saveProfile} className="glass-panel w-full max-w-lg p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                      <button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-white"><X /></button>
                    </div>
                    <label className="block text-sm text-gray-400">
                      Discord username
                      <input readOnly value={profile.username || ''} className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-400 outline-none cursor-not-allowed" />
                    </label>
                    <label className="block text-sm text-gray-400">
                      Bio
                      <textarea maxLength={500} value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="mt-2 w-full min-h-28 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" />
                    </label>
                    <label className="block text-sm text-gray-400">
                      Languages (comma-separated)
                      <input value={(profile.languages || []).join(', ')} onChange={e => setProfile({ ...profile, languages: e.target.value.split(',').map((value: string) => value.trim()).filter(Boolean) })} className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" />
                    </label>
                    <label className="block text-sm text-gray-400">
                      Timezone
                      <input value={profile.timezone || ''} onChange={e => setProfile({ ...profile, timezone: e.target.value })} className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" />
                    </label>
                    <label className="block text-sm text-gray-400">
                      Contact (Discord ID, email, or social)
                      <input maxLength={200} value={profile.contact || ''} onChange={e => setProfile({ ...profile, contact: e.target.value })} placeholder="Discord, email, or social handle" className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-mf-primary" />
                    </label>
                    <button disabled={saving} className="w-full bg-mf-primary hover:bg-mf-primary/80 py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2">
                      <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-mf-primary" /> Game Profiles
            </h3>
            
            <div className="space-y-4">
              {/* Game 1 */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 font-bold border border-red-500/30">
                    VAL
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Valorant</h4>
                    <p className="text-sm text-gray-400">Controller / Sentinel</p>
                  </div>
                </div>
                <div className="text-center sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-gray-700 pt-3 sm:pt-0">
                  <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white">Immortal 1</span>
                  </div>
                  <p className="text-xs text-gray-500">Peak: Immortal 3</p>
                </div>
              </div>

              {/* Game 2 */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-400 font-bold border border-yellow-500/30">
                    APEX
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Apex Legends</h4>
                    <p className="text-sm text-gray-400">Support / Anchor</p>
                  </div>
                </div>
                <div className="text-center sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-gray-700 pt-3 sm:pt-0">
                  <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
                    <Award className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white">Diamond IV</span>
                  </div>
                  <p className="text-xs text-gray-500">Current Split</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
