import React from 'react';
import { Home, Beer, Bell, MessageCircle, User } from 'lucide-react';
import { motion } from 'motion/react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: '主頁' },
    { id: 'bar', icon: Beer, label: '旅吧' },
    { id: 'chat', icon: MessageCircle, label: '聊天室' },
    { id: 'notifications', icon: Bell, label: '通知' },
    { id: 'profile', icon: User, label: '個人' }
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 pointer-events-none flex justify-center px-4">
      <nav 
        className="pointer-events-auto w-full max-w-[400px] rounded-full p-1.5 bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_10px_32px_rgba(0,0,0,0.10),inset_0_1.5px_1px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(255,255,255,0.4)] flex items-center justify-between relative overflow-hidden"
        aria-label="Main Navigation"
      >
        {/* Top glossy sheen line */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full focus:outline-none group select-none"
            >
              {/* Active Liquid Glass Pill Indicator */}
              {isActive && (
                <motion.div
                  layoutId="liquid-glass-tab-indicator"
                  className="absolute inset-0 rounded-full bg-white/85 backdrop-blur-xl border border-white shadow-[0_4px_16px_rgba(0,129,209,0.12),inset_0_1px_2px_rgba(255,255,255,1)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}

              <span className={`relative z-10 flex flex-col items-center gap-0.5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-100 active:scale-95'}`}>
                <tab.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 1.8} 
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-[#0081d1]' : 'text-apple-gray-600 group-hover:text-apple-gray-900'
                  }`}
                  fill={isActive && tab.id === 'home' ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-[#0081d1] font-bold' : 'text-apple-gray-600 font-medium'
                }`}>
                  {tab.label}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

