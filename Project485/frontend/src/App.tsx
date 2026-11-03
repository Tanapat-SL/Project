import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Search, MessageSquare, User, Gamepad2, Settings, LogOut, Bell } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { apiClient } from './api/client';

import ExploreView from './components/ExploreView';
import ChatView from './components/ChatView';
import ProfileView from './components/ProfileView';
import PartyDetailView from './components/PartyDetailView';
import NotificationsView from './components/NotificationsView';

import SettingsView from './components/SettingsView';


const socket: Socket = io();

function MainLayout() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem('mf_theme') || 'dark';
    // 1. Socket Connection
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // 2. Auth Check (Discord Login Token)
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');

    if (tokenFromUrl) {
      localStorage.setItem('mf_token', tokenFromUrl);
      window.history.replaceState({}, document.title, "/"); // เธฅเนเธฒเธ URL เนเธซเนเธชเธฐเธญเธฒเธ”
    }

    const savedToken = localStorage.getItem('mf_token');
    if (savedToken) {
      fetchUserData(savedToken);
      apiClientGetNotifications(savedToken);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };

    async function apiClientGetNotifications(token: string) {
      try {
        const res = await apiClient.get('/notifications');
        setNotificationCount(res.data.filter((item: any) => !item.readAt).length);
      } catch {
        setNotificationCount(0);
      }
    }
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const res = await apiClient.get('/auth/me');
      setCurrentUser(res.data);
    } catch (error) {
      console.error("Session expired or invalid");
      localStorage.removeItem('mf_token');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mf_token');
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex bg-mf-dark">
      {/* Sidebar Navigation */}
      <nav className="w-20 lg:w-64 glass-panel border-l-0 border-y-0 rounded-none border-r flex flex-col justify-between p-4 sticky top-0 h-screen z-50">
        <div>
          <a href="/" aria-label="MATCHFOUND home and refresh" className="flex items-center justify-center lg:justify-start gap-3 mb-10 px-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-mf-primary">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mf-primary to-mf-secondary flex items-center justify-center shadow-lg shadow-mf-primary/20 shrink-0">
              <Gamepad2 className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-wider hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-mf-primary to-mf-secondary">
              MATCHFOUND
            </h1>
          </a>

          <div className="space-y-2">
            <Link to="/">
              <NavButton icon={<Search />} label="Explore LFG" active={currentPath === '/' || currentPath.startsWith('/party')} />
            </Link>
            <Link to="/chat">
              <NavButton icon={<MessageSquare />} label="Chat Hub" active={currentPath === '/chat'} />
            </Link>
            <Link to="/notifications">
              <NavButton icon={<Bell />} label="Notifications" active={currentPath === '/notifications'} badge={notificationCount ? String(notificationCount) : undefined} />
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          {/* User Profile or Discord Login Button */}
          {currentUser ? (
            <Link to="/profile" className={`flex items-center gap-3 p-3 rounded-xl mb-4 border transition-colors ${currentPath === '/profile' ? 'bg-mf-primary/10 border-mf-primary/40' : 'bg-gray-800/80 border-gray-700 hover:border-mf-primary/40'}`}>
              <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-mf-primary object-cover shrink-0" />
              <div className="hidden lg:block overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.displayName || currentUser.username}</p>
                <p className="text-xs text-mf-primary">My Profile</p>
              </div>
            </Link>
          ) : (
            <a href="/api/auth/discord" className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors mb-4 shadow-lg shadow-[#5865F2]/20">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
              <span className="font-bold hidden lg:block">Login with Discord</span>
            </a>
          )}

          <div className="hidden lg:flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">{isConnected ? 'System Online' : 'Connecting...'}</span>
          </div>
          <Link to="/settings">
            <NavButton icon={<Settings />} label="Settings" active={currentPath === '/settings'} />
          </Link>
          {currentUser && (
            <button onClick={handleLogout} className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors group">
              <LogOut className="group-hover:text-red-400" /> <span className="hidden lg:block font-medium">Logout</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-10 h-screen overflow-y-auto">
        <Routes>
          <Route path="/" element={<ExploreView />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/party/:id" element={<PartyDetailView />} />
          <Route path="/matchmaker" element={<Navigate to="/" replace />} />
          <Route path="/notifications" element={<NotificationsView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}

function NavButton({ icon, label, active = false, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string }) {
  return (
    <div className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all relative
      ${active ? 'bg-mf-primary/10 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}
    `}>
      <div className={`${active ? 'text-mf-primary' : ''}`}>
        {icon}
      </div>
      <span className={`hidden lg:block font-medium ${active ? 'text-white' : ''}`}>{label}</span>
      {badge && (
        <span className="absolute top-2 right-2 lg:relative lg:top-auto lg:right-auto lg:ml-auto bg-mf-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}
