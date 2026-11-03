import React from 'react';
import { Settings, Send } from 'lucide-react';

export default function ChatView() {
  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Contact List */}
      <div className="w-full md:w-80 glass-panel p-4 flex flex-col h-1/3 md:h-full flex-shrink-0">
        <h3 className="font-bold text-lg mb-4 px-2">Messages</h3>
        <div className="space-y-2 overflow-y-auto pr-2">
          {/* Active Chat */}
          <div className="p-3 bg-mf-primary/10 border border-mf-primary/20 rounded-xl cursor-pointer">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-white truncate">Valorant Ranked Squad</span>
              <span className="text-xs text-mf-primary whitespace-nowrap ml-2">Now</span>
            </div>
            <p className="text-sm text-gray-400 truncate">JettMain99: Drop Discord link</p>
          </div>
          {/* Other Chats */}
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-3 hover:bg-gray-800/50 rounded-xl cursor-pointer transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-gray-300 truncate">Player_{i}</span>
                <span className="text-xs text-gray-600 whitespace-nowrap ml-2">2h ago</span>
              </div>
              <p className="text-sm text-gray-500 truncate">GGs man, let's play again tomorrow.</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-panel flex flex-col h-2/3 md:h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-white">Valorant Ranked Squad</h3>
            <p className="text-xs text-green-400">3 Members Online</p>
          </div>
          <button className="text-gray-400 hover:text-white"><Settings className="w-5 h-5" /></button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">JM</div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-mf-accent text-sm">JettMain99</span>
                <span className="text-xs text-gray-500">10:42 AM</span>
              </div>
              <p className="text-gray-300 mt-1 bg-gray-800 p-3 rounded-2xl rounded-tl-sm inline-block">Hey guys, everyone got mics?</p>
            </div>
          </div>
          <div className="flex gap-3 flex-row-reverse">
            <div>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-xs text-gray-500">10:43 AM</span>
                <span className="font-semibold text-mf-primary text-sm">You</span>
              </div>
              <p className="text-white mt-1 bg-mf-primary p-3 rounded-2xl rounded-tr-sm inline-block">Yep, ready when you are.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">SO</div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-gray-300 text-sm">SovaLineupTTV</span>
                <span className="text-xs text-gray-500">10:45 AM</span>
              </div>
              <p className="text-gray-300 mt-1 bg-gray-800 p-3 rounded-2xl rounded-tl-sm inline-block">Send lobby inv</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl">
          <div className="relative flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl py-3 pl-4 pr-4 text-white focus:outline-none focus:border-mf-primary focus:ring-1 focus:ring-mf-primary"
            />
            <button className="p-3 bg-mf-primary hover:bg-mf-primary/80 rounded-xl text-white transition-colors flex-shrink-0">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
