import React from 'react';
import { Home, Beer, Bell, MessageCircle, User } from 'lucide-react';

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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-apple-gray-100 pb-safe z-50">
      <div className="flex justify-around items-center h-20 px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center w-full py-1 relative"
            >
              <div className={`transition-colors duration-200 ${isActive ? 'text-apple-blue' : 'text-apple-gray-300'}`}>
                <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} fill={isActive && tab.id === 'home' ? 'currentColor' : 'none'} />
              </div>
              <span className={`text-[10px] mt-1.5 transition-colors duration-200 ${isActive ? 'text-apple-blue font-bold' : 'text-apple-gray-300 font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
