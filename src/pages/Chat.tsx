import React, { useEffect, useState, useRef } from 'react';
import { Search, UserPlus, Send, ArrowLeft, Users, Plane, Image as ImageIcon, Video, Plus, X, Lock, Play, Camera, ShieldCheck, Download, ChevronLeft, ChevronRight, ArrowUp, FileText, MapPin, Calendar, Wallet, BarChart2, Dices, Sparkles, Navigation, DollarSign, Vote, CheckCircle2, Trash2, Clock, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, getDoc, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { ChatRoom, Message, UserProfile, PollData, PollOption } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface ChatRoomItemProps {
  room: ChatRoom;
  onClick: () => void;
}

const ChatRoomItem: React.FC<ChatRoomItemProps> = ({ room, onClick }) => {
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const isGroup = room.type === 'group';
  const otherId = room.participants.find(id => id !== user?.uid);

  useEffect(() => {
    if (!isGroup && otherId) {
      getDoc(doc(db, 'users', otherId)).then(s => s.exists() && setOtherUser(s.data() as UserProfile));
    }
  }, [otherId, isGroup]);

  const formatTime = (time: any) => {
    if (!time) return '';
    try {
      const date = typeof time === 'string' ? new Date(time) : (time.toDate ? time.toDate() : new Date());
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div onClick={onClick} className="flex gap-4 p-4 active:bg-apple-gray-50 transition-colors cursor-pointer border-b border-apple-gray-50">
      <div className="w-14 h-14 rounded-full bg-apple-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {isGroup ? (
          <div className="bg-apple-blue/10 w-full h-full flex items-center justify-center text-apple-blue">
            <Users size={28} />
          </div>
        ) : otherUser?.avatarUrl ? (
          <img src={otherUser.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl text-apple-gray-300 font-bold">
            {otherUser?.displayName?.[0] || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="font-semibold text-sm truncate">
            {isGroup ? room.name : (otherUser?.displayName || '載入中...')}
          </h3>
          <span className="text-[10px] text-apple-gray-300">
            {formatTime(room.lastUpdatedAt)}
          </span>
        </div>
        <p className="text-xs text-apple-gray-400 truncate font-light">{room.lastMessage || '尚無訊息'}</p>
      </div>
    </div>
  );
};

const PRESET_ALBUM_MEDIA = [
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80', title: '日本東京' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80', title: '瑞士雪山' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80', title: '法國巴黎' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', title: '馬爾地夫' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80', title: '日本京都' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80', title: '美國紐約' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1483168527879-c66136b56105?auto=format&fit=crop&w=400&q=80', title: '冰島極光' },
  { type: 'video' as const, url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-43319-large.mp4', title: '大海海浪' },
  { type: 'video' as const, url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-thick-snow-covered-forest-42526-large.mp4', title: '北歐雪林' }
];

const INITIAL_MOCK_USER_PHOTOS = [
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80', title: '湖畔小木屋' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80', title: '山遊漫步' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=400&q=80', title: '落日峽灣' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=400&q=80', title: '晨曦海岸' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1472214222541-d510753a8707?auto=format&fit=crop&w=400&q=80', title: '翠綠山谷' },
  { type: 'image' as const, url: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=400&q=80', title: '歐洲小鎮' }
];

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface LongPressableImageProps {
  media: { type: 'image' | 'video', url: string };
  onClick: () => void;
  onLongPress: () => void;
  className?: string;
  imgClassName?: string;
}

const LongPressableImage: React.FC<LongPressableImageProps> = ({
  media,
  onClick,
  onLongPress,
  className = '',
  imgClassName = ''
}) => {
  const timerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  const startPress = (clientX: number, clientY: number) => {
    isLongPressRef.current = false;
    touchStartPosRef.current = { x: clientX, y: clientY };
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, 600); // 600ms long press threshold
  };

  const cancelPress = (clientX: number, clientY: number, checkDistance = false) => {
    if (checkDistance) {
      const dx = Math.abs(clientX - touchStartPosRef.current.x);
      const dy = Math.abs(clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startPress(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    cancelPress(e.clientX, e.clientY, true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPressRef.current) {
      onClick();
    }
    isLongPressRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPress(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    cancelPress(touch.clientX, touch.clientY, true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPressRef.current) {
      onClick();
    }
    isLongPressRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => cancelPress(0, 0, false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`${className} select-none`}
    >
      {media.type === 'image' ? (
        <img 
          src={media.url} 
          className={imgClassName} 
          referrerPolicy="no-referrer" 
          draggable={false}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        />
      ) : (
        <div className="relative w-full h-full">
          <video 
            src={media.url} 
            className={imgClassName} 
            controls={false} 
            style={{ pointerEvents: 'none' }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">影片</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface LineImageGridProps {
  mediaList: { type: 'image' | 'video', url: string }[];
  isMe: boolean;
  onMediaClick: (url: string) => void;
  onMediaLongPress: (url: string) => void;
}

const LineImageGrid: React.FC<LineImageGridProps> = ({ mediaList, isMe, onMediaClick, onMediaLongPress }) => {
  const N = mediaList.length;
  if (N === 0) return null;

  // Render different layouts depending on the count N to match LINE grid styling
  if (N === 1) {
    const media = mediaList[0];
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
        <LongPressableImage
          media={media}
          onClick={() => onMediaClick(media.url)}
          onLongPress={() => onMediaLongPress(media.url)}
          className="relative max-w-[240px] max-h-[320px] rounded-2xl overflow-hidden border border-black/5 bg-apple-gray-50 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
          imgClassName="w-full h-auto max-h-[320px] object-contain rounded-2xl"
        />
      </div>
    );
  }

  if (N === 2) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
        <div className="grid grid-cols-2 gap-1 w-[260px] h-[130px] rounded-2xl overflow-hidden border border-black/5 bg-apple-gray-50 shadow-sm">
          {mediaList.map((media, idx) => (
            <LongPressableImage
              key={idx}
              media={media}
              onClick={() => onMediaClick(media.url)}
              onLongPress={() => onMediaLongPress(media.url)}
              className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
              imgClassName="w-full h-full object-cover"
            />
          ))}
        </div>
      </div>
    );
  }

  if (N === 3) {
    // 1 large on left, 2 stacked on right
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
        <div className="flex gap-1 w-[260px] h-[174px] rounded-2xl overflow-hidden border border-black/5 bg-apple-gray-50 shadow-sm">
          {/* Left Column (1 image, large) */}
          <div className="w-[172px] h-full">
            <LongPressableImage
              media={mediaList[0]}
              onClick={() => onMediaClick(mediaList[0].url)}
              onLongPress={() => onMediaLongPress(mediaList[0].url)}
              className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
              imgClassName="w-full h-full object-cover"
            />
          </div>
          {/* Right Column (2 images, stacked) */}
          <div className="flex-1 flex flex-col gap-1 h-full">
            <div className="flex-1 h-0 min-h-0">
              <LongPressableImage
                media={mediaList[1]}
                onClick={() => onMediaClick(mediaList[1].url)}
                onLongPress={() => onMediaLongPress(mediaList[1].url)}
                className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
                imgClassName="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 h-0 min-h-0">
              <LongPressableImage
                media={mediaList[2]}
                onClick={() => onMediaClick(mediaList[2].url)}
                onLongPress={() => onMediaLongPress(mediaList[2].url)}
                className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
                imgClassName="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (N === 4) {
    // 2x2 Grid
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
        <div className="grid grid-cols-2 gap-1 w-[260px] h-[260px] rounded-2xl overflow-hidden border border-black/5 bg-apple-gray-50 shadow-sm">
          {mediaList.map((media, idx) => (
            <LongPressableImage
              key={idx}
              media={media}
              onClick={() => onMediaClick(media.url)}
              onLongPress={() => onMediaLongPress(media.url)}
              className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
              imgClassName="w-full h-full object-cover"
            />
          ))}
        </div>
      </div>
    );
  }

  if (N === 5) {
    // Top row: 2 images, Bottom row: 3 images
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
        <div className="flex flex-col gap-1 w-[260px] h-[260px] rounded-2xl overflow-hidden border border-black/5 bg-apple-gray-50 shadow-sm">
          {/* Top Row: 2 images */}
          <div className="flex gap-1 h-[130px]">
            {mediaList.slice(0, 2).map((media, idx) => (
              <div key={idx} className="flex-1 h-full min-w-0">
                <LongPressableImage
                  media={media}
                  onClick={() => onMediaClick(media.url)}
                  onLongPress={() => onMediaLongPress(media.url)}
                  className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
                  imgClassName="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {/* Bottom Row: 3 images */}
          <div className="flex gap-1 h-[126px]">
            {mediaList.slice(2, 5).map((media, idx) => (
              <div key={idx} className="flex-1 h-full min-w-0">
                <LongPressableImage
                  media={media}
                  onClick={() => onMediaClick(media.url)}
                  onLongPress={() => onMediaLongPress(media.url)}
                  className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
                  imgClassName="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // N >= 6, show 3x3 layout (up to 9 displayed)
  const maxDisplay = 9;
  const itemsToDisplay = mediaList.slice(0, maxDisplay);
  const remainingCount = N - maxDisplay;

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
      <div className="grid grid-cols-3 gap-1 w-[260px] h-[260px] rounded-2xl overflow-hidden border border-black/5 bg-apple-gray-50 shadow-sm">
        {itemsToDisplay.map((media, idx) => {
          const isLastAndHasMore = idx === maxDisplay - 1 && remainingCount > 0;
          return (
            <div key={idx} className="relative w-full h-full min-h-0 min-w-0">
              <LongPressableImage
                media={media}
                onClick={() => onMediaClick(media.url)}
                onLongPress={() => onMediaLongPress(media.url)}
                className="relative w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
                imgClassName="w-full h-full object-cover"
              />
              {isLastAndHasMore && (
                <div 
                  onClick={() => onMediaClick(media.url)}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-lg font-bold cursor-pointer"
                >
                  +{remainingCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface WhatsAppGalleryModalProps {
  mediaList: { type: 'image' | 'video', url: string, senderName?: string, time?: string }[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (url: string) => void;
}

const WhatsAppGalleryModal: React.FC<WhatsAppGalleryModalProps> = ({
  mediaList,
  initialIndex,
  onClose,
  onDownload,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mediaList, currentIndex]);

  if (mediaList.length === 0 || currentIndex < 0 || currentIndex >= mediaList.length) return null;

  const currentMedia = mediaList[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none"
    >
      {/* Top Bar */}
      <div className="px-4 py-4 flex items-center justify-between text-white border-b border-white/10 z-10 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
          >
            <X size={20} />
          </button>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{currentIndex + 1} / {mediaList.length}</span>
              {currentMedia.senderName && (
                <span className="text-xs text-white/70 font-normal">({currentMedia.senderName})</span>
              )}
            </div>
            {currentMedia.time && (
              <div className="text-[10px] text-white/60">{currentMedia.time}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload(currentMedia.url)}
            className="px-3.5 py-1.5 rounded-full bg-[#E6F5FF] text-[#2A2B2A] hover:bg-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Download size={15} />
            <span>儲存照片</span>
          </button>
        </div>
      </div>

      {/* Main Swipeable Viewport */}
      <div 
        className="flex-1 relative flex items-center justify-center p-2 overflow-hidden cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left Chevron Button */}
        {mediaList.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 active:scale-90 transition-all backdrop-blur-xs hidden sm:flex items-center justify-center shadow-lg"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Current Media Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-[75vh] flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {currentMedia.type === 'video' || currentMedia.url.includes('mixkit.co') || currentMedia.url.startsWith('data:video/') ? (
              <video 
                src={currentMedia.url} 
                controls 
                autoPlay 
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl" 
              />
            ) : (
              <img 
                src={currentMedia.url} 
                alt="gallery" 
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl" 
                referrerPolicy="no-referrer"
                draggable={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right Chevron Button */}
        {mediaList.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 active:scale-90 transition-all backdrop-blur-xs hidden sm:flex items-center justify-center shadow-lg"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Filmstrip */}
      {mediaList.length > 1 && (
        <div className="px-4 py-3 bg-black/90 border-t border-white/10 overflow-x-auto no-scrollbar flex items-center justify-center gap-2 z-10">
          {mediaList.map((m, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                  isActive 
                    ? 'ring-2 ring-[#E6F5FF] scale-110 opacity-100 shadow-lg' 
                    : 'opacity-40 hover:opacity-80'
                }`}
              >
                {m.type === 'image' ? (
                  <img src={m.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="relative w-full h-full bg-gray-900">
                    <video src={m.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play size={12} className="text-white fill-white" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

interface PollCardProps {
  messageId: string;
  poll: PollData;
  currentUserId?: string;
  msgTime: string;
  isMe: boolean;
  onVote: (optionId: string) => void;
  onViewVotes: () => void;
}

const PollCard: React.FC<PollCardProps> = ({
  poll,
  currentUserId,
  msgTime,
  onVote,
  onViewVotes
}) => {
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0);
  const isPastDeadline = poll.deadline ? new Date() > new Date(poll.deadline) : false;

  const formatDeadline = (dlStr: string) => {
    try {
      const d = new Date(dlStr);
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${month}/${date} ${hours}:${mins}`;
    } catch {
      return dlStr;
    }
  };

  return (
    <div className="w-[280px] sm:w-[320px] bg-[#e6f5ff] rounded-[5px] p-4.5 border border-[#b3e0ff] shadow-apple-xs font-sans flex flex-col relative overflow-hidden text-left">
      {/* Title & Badges */}
      <div className="mb-2">
        <h4 className="font-bold text-base sm:text-lg text-apple-gray-900 leading-snug break-words">
          {poll.question}
        </h4>
        <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-apple-gray-500 font-medium mt-1.5">
          <div className="flex items-center gap-1 text-[#0081d1] bg-white/80 px-2 py-0.5 rounded-full border border-[#cce8ff] shadow-2xs">
            <CheckCircle2 size={12} />
            <span>{poll.allowMultiple ? '可複選' : '單選'}</span>
          </div>
          {poll.isAnonymous ? (
            <span className="bg-[#8B5CF6]/10 text-[#7C3AED] px-2 py-0.5 rounded-full border border-[#8B5CF6]/20 font-bold">
              🔒 匿名
            </span>
          ) : (
            <span className="bg-white/80 text-apple-gray-600 px-2 py-0.5 rounded-full border border-apple-gray-200">
              具名
            </span>
          )}
          {poll.deadline && (
            <span className={`px-2 py-0.5 rounded-full border text-[10px] ${
              isPastDeadline 
                ? 'bg-red-100 text-red-600 border-red-200 font-bold' 
                : 'bg-white/80 text-apple-gray-600 border-[#cce8ff]'
            }`}>
              {isPastDeadline ? '🛑 已截止' : `⏰ 截止: ${formatDeadline(poll.deadline)}`}
            </span>
          )}
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-2.5 my-2">
        {poll.options.map(opt => {
          const voterCount = opt.voterIds?.length || 0;
          const isVotedByMe = currentUserId ? opt.voterIds?.includes(currentUserId) : false;
          const percentage = totalVotes > 0 ? Math.round((voterCount / totalVotes) * 100) : 0;

          return (
            <div
              key={opt.id}
              onClick={() => onVote(opt.id)}
              className="cursor-pointer group flex flex-col gap-1 active:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isVotedByMe 
                      ? 'bg-[#0081d1] text-white shadow-xs scale-105' 
                      : 'border-2 border-apple-gray-300 bg-white group-hover:border-[#0081d1]'
                  }`}>
                    {isVotedByMe && <Check size={12} className="stroke-[3]" />}
                  </div>

                  <span className={`text-sm font-semibold break-words line-clamp-2 ${
                    isVotedByMe ? 'text-[#0081d1] font-bold' : 'text-apple-gray-800'
                  }`}>
                    {opt.text}
                  </span>
                </div>

                <div className="text-xs font-bold text-apple-gray-500 flex-shrink-0">
                  {voterCount}
                </div>
              </div>

              {/* Progress bar line */}
              <div className="w-full h-1.5 bg-white/80 rounded-full overflow-hidden border border-[#b3e0ff]/60">
                <div 
                  className="h-full bg-[#0081d1] rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Footer */}
      <div className="border-t border-[#b3e0ff]/60 pt-2 mt-1 flex items-center justify-between text-xs text-apple-gray-500">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewVotes();
          }}
          className="font-bold text-[#0081d1] hover:underline active:opacity-75 transition-opacity"
        >
          View votes (檢視投票)
        </button>

        <span className="text-[10px] text-apple-gray-400 font-medium">
          {msgTime}
        </span>
      </div>
    </div>
  );
};

const ChatView: React.FC<{ roomId: string, onBack: () => void, onBackToTrip?: (tripId: string) => void }> = ({ roomId, onBack, onBackToTrip }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [participantProfiles, setParticipantProfiles] = useState<{[key: string]: UserProfile}>({});
  const [showBackOptions, setShowBackOptions] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const [isSending, setIsSending] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Photo & Video Attachments Feature States
  const [draftMedia, setDraftMedia] = useState<{ type: 'image' | 'video', url: string }[]>([]);
  const [tempSelectedMedia, setTempSelectedMedia] = useState<{ type: 'image' | 'video', url: string }[]>([]);
  const [localUploadedMedia, setLocalUploadedMedia] = useState<{ type: 'image' | 'video', url: string }[]>(INITIAL_MOCK_USER_PHOTOS);
  const [activeMediaTab, setActiveMediaTab] = useState<'my-photos' | 'samples'>('my-photos');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionState, setPermissionState] = useState<'undetermined' | 'granted' | 'denied'>(() => {
    return (localStorage.getItem('album_permission_granted') as any) || 'undetermined';
  });
  
  // WhatsApp-style gallery state
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number | null>(null);
  const [longPressedMediaUrl, setLongPressedMediaUrl] = useState<string | null>(null);
  const [showSaveSuccessToast, setShowSaveSuccessToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachment sheet & quick action modals state
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);

  // Form states for feature modals
  const [customLocationName, setCustomLocationName] = useState('');
  const [customLocationAddress, setCustomLocationAddress] = useState('');

  const [itineraryTitle, setItineraryTitle] = useState('東京 5 日精華之旅');
  const [itineraryDetail, setItineraryDetail] = useState('Day 2: 清水寺 ➔ 祇園散策 ➔ 鴨川日式晚餐');

  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Enhanced WhatsApp-style Poll States
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionInputs, setPollOptionInputs] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollSetDeadline, setPollSetDeadline] = useState(false);
  const [pollDeadline, setPollDeadline] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false);

  // Viewing votes state
  const [viewingVotesPoll, setViewingVotesPoll] = useState<{ messageId: string, poll: PollData } | null>(null);

  const handleAddPollOption = () => {
    setPollOptionInputs(prev => [...prev, '']);
  };

  const handleUpdatePollOption = (index: number, val: string) => {
    setPollOptionInputs(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptionInputs.length <= 2) return;
    setPollOptionInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateAndSendPoll = async () => {
    if (!pollQuestion.trim()) {
      alert('請輸入投票問題或主題');
      return;
    }
    const validOptions = pollOptionInputs.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      alert('請至少填寫兩個投票選項');
      return;
    }

    const pollData: PollData = {
      id: `poll_${Date.now()}`,
      question: pollQuestion.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text,
        voterIds: []
      })),
      allowMultiple: pollAllowMultiple,
      isAnonymous: pollIsAnonymous,
      ...(pollSetDeadline && pollDeadline ? { deadline: pollDeadline } : {}),
      creatorId: user?.uid || '',
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        senderId: user?.uid,
        text: `📊 投票：${pollQuestion.trim()}`,
        poll: pollData,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastMessage: `📊 投票：${pollQuestion.trim()}`,
        lastUpdatedAt: serverTimestamp()
      });

      // Reset form
      setPollQuestion('');
      setPollOptionInputs(['', '']);
      setPollAllowMultiple(false);
      setPollSetDeadline(false);
      setPollIsAnonymous(false);
      setShowPollModal(false);
    } catch (e) {
      console.error('Error creating poll:', e);
      alert('發起投票失敗');
    }
  };

  const handleVotePollOption = async (messageId: string, currentPoll: PollData, optionId: string) => {
    if (!user?.uid) return;

    if (currentPoll.deadline) {
      const isPast = new Date() > new Date(currentPoll.deadline);
      if (isPast) {
        alert('此投票已超過截止時間，無法繼續投票。');
        return;
      }
    }

    const currentUserId = user.uid;
    const updatedOptions = currentPoll.options.map(opt => {
      const hasVoted = opt.voterIds?.includes(currentUserId);
      if (currentPoll.allowMultiple) {
        if (opt.id === optionId) {
          return {
            ...opt,
            voterIds: hasVoted 
              ? opt.voterIds.filter(id => id !== currentUserId) 
              : [...(opt.voterIds || []), currentUserId]
          };
        }
        return opt;
      } else {
        if (opt.id === optionId) {
          return {
            ...opt,
            voterIds: hasVoted 
              ? opt.voterIds.filter(id => id !== currentUserId) 
              : [...(opt.voterIds || []), currentUserId]
          };
        } else {
          return {
            ...opt,
            voterIds: (opt.voterIds || []).filter(id => id !== currentUserId)
          };
        }
      }
    });

    try {
      const updatedPoll: PollData = {
        ...currentPoll,
        options: updatedOptions
      };
      await updateDoc(doc(db, 'chatRooms', roomId, 'messages', messageId), {
        poll: updatedPoll
      });
    } catch (e) {
      console.error('Error voting on poll:', e);
    }
  };

  const [drawTopic, setDrawTopic] = useState('今天由誰來買晚餐/飲料？');
  const [drawCandidatesText, setDrawCandidatesText] = useState('方方老Baby, 小明, Phoebe, 阿傑');
  const [drawResult, setDrawResult] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const sendCustomSystemCard = async (msgText: string) => {
    if (!msgText.trim()) return;
    try {
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        senderId: user?.uid,
        text: msgText,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastMessage: msgText,
        lastUpdatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`;
    
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          const newMedia = { type, url: event.target.result as string };
          setLocalUploadedMedia(prev => [newMedia, ...prev]);
          setDraftMedia(prev => [...prev, newMedia]);
        }
      };
      reader.readAsDataURL(file);
    } else {
      sendCustomSystemCard(`📄 檔案分享：${file.name} (${sizeStr})`);
    }
  };

  const handleRunDraw = () => {
    const candidates = drawCandidatesText.split(/[,，\n]/).map(c => c.trim()).filter(Boolean);
    if (candidates.length === 0) return;
    setIsDrawing(true);
    let count = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * candidates.length);
      setDrawResult(candidates[randomIdx]);
      count++;
      if (count >= 15) {
        clearInterval(interval);
        setIsDrawing(false);
      }
    }, 80);
  };

  const formatMsgTime = (time: any) => {
    if (!time) return '';
    try {
      const date = typeof time === 'string' ? new Date(time) : (time.toDate ? time.toDate() : new Date(time));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '';
    }
  };

  const allChatMedia = React.useMemo(() => {
    const list: { type: 'image' | 'video', url: string, senderName?: string, time?: string }[] = [];
    messages.forEach(m => {
      if (m.mediaList && m.mediaList.length > 0) {
        const sender = participantProfiles[m.senderId];
        const timeStr = formatMsgTime(m.createdAt);
        m.mediaList.forEach(media => {
          list.push({
            type: media.type,
            url: media.url,
            senderName: sender?.displayName || (m.senderId === user?.uid ? '我' : '使用者'),
            time: timeStr
          });
        });
      }
    });
    return list;
  }, [messages, participantProfiles, user]);

  const handleMediaClickInChat = (url: string) => {
    const idx = allChatMedia.findIndex(m => m.url === url);
    if (idx !== -1) {
      setGalleryInitialIndex(idx);
    } else {
      setGalleryInitialIndex(0);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    getDoc(doc(db, 'chatRooms', roomId)).then(async s => {
      if (s.exists()) {
        const rData = s.data() as ChatRoom;
        setRoom(rData);
        
        // Fetch labels for all participants
        const profiles: {[key: string]: UserProfile} = {};
        for (const pId of rData.participants) {
          const uS = await getDoc(doc(db, 'users', pId));
          if (uS.exists()) {
            profiles[pId] = uS.data() as UserProfile;
          }
        }
        setParticipantProfiles(profiles);
      }
    });

    const q = query(collection(db, 'chatRooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (s) => {
      const mapped = s.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(mapped);
    });
  }, [roomId, user]);

  const otherUser = room?.type !== 'group' ? (Object.values(participantProfiles) as UserProfile[]).find(p => p.uid !== user?.uid) : null;

  const downloadMedia = async (url: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `media_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowSaveSuccessToast(true);
        setTimeout(() => setShowSaveSuccessToast(false), 2000);
        return;
      }

      const res = await fetch(url, { referrerPolicy: 'no-referrer' });
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `media_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setShowSaveSuccessToast(true);
      setTimeout(() => setShowSaveSuccessToast(false), 2000);
    } catch (e) {
      // Fallback: trigger download link or open in new tab
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = `media_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowSaveSuccessToast(true);
      setTimeout(() => setShowSaveSuccessToast(false), 2000);
    }
  };

  const sendMsg = async () => {
    if ((!text.trim() && draftMedia.length === 0) || !user || isSending) return;
    const msg = text;
    const mediaToSend = [...draftMedia];
    
    setText('');
    setDraftMedia([]);
    setIsSending(true);
    
    try {
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        senderId: user.uid,
        text: msg,
        mediaList: mediaToSend,
        createdAt: new Date().toISOString()
      });
      
      let lastMsgText = msg;
      if (mediaToSend.length > 0 && !lastMsgText) {
        lastMsgText = `[傳送了 ${mediaToSend.length} 個媒體內容]`;
      }
      
      await updateDoc(doc(db, 'chatRooms', roomId), {
        lastMessage: lastMsgText,
        lastUpdatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Error sending message:', e);
      alert('訊息傳送失敗');
    } finally {
      setIsSending(false);
    }
  };

  const handleBackClick = () => {
    if (room?.type === 'group' && room.tripId) {
      setShowBackOptions(true);
    } else {
      onBack();
    }
  };

  const handleMediaClick = () => {
    if (permissionState === 'granted') {
      setTempSelectedMedia([...draftMedia]);
      setShowMediaPicker(true);
    } else if (permissionState === 'denied') {
      setShowPermissionModal(true);
    } else {
      setShowPermissionModal(true);
    }
  };

  const grantPermission = () => {
    localStorage.setItem('album_permission_granted', 'granted');
    setPermissionState('granted');
    setShowPermissionModal(false);
    setTempSelectedMedia([...draftMedia]);
    setShowMediaPicker(true);
  };

  const denyPermission = () => {
    localStorage.setItem('album_permission_granted', 'denied');
    setPermissionState('denied');
    setShowPermissionModal(false);
  };

  const toggleMediaSelection = (item: { type: 'image' | 'video', url: string }) => {
    const isSelected = tempSelectedMedia.some(m => m.url === item.url);
    if (isSelected) {
      setTempSelectedMedia(prev => prev.filter(m => m.url !== item.url));
    } else {
      setTempSelectedMedia(prev => [...prev, item]);
    }
  };

  const handleSystemFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsCompressing(true);
    const fileList: any[] = Array.from(files);
    const validResults: { type: 'image' | 'video', url: string }[] = [];
    
    try {
      for (const file of fileList) {
        const result = await new Promise<{ type: 'image' | 'video', url: string } | null>((resolve) => {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          
          if (!isImage && !isVideo) {
            alert(`不支援的格式：${file.name}，請選擇圖片或影片文件！`);
            resolve(null);
            return;
          }

          // Strict limit for video at 600KB to ensure Base64 encoding stays well below 1MB Firestore limit
          if (isVideo && file.size > 600 * 1024) {
            alert(`影片 "${file.name}" 超過限制 (600KB)。為了確保聊天訊息能成功傳送並保存於資料庫，上傳的影片請限制在 600KB 以內喔！`);
            resolve(null);
            return;
          }

          const reader = new FileReader();
          reader.onload = async (event) => {
            const resultUrl = event.target?.result as string;
            if (resultUrl) {
              let finalUrl = resultUrl;
              if (isImage) {
                try {
                  // Compress image to 600x600 with 0.4 quality so the file is around 20KB-40KB, making it render instantly and save perfectly
                  finalUrl = await compressImage(resultUrl, 600, 600, 0.4);
                } catch (err) {
                  console.error('Compression failed, using original', err);
                }
              }
              resolve({ type: isImage ? 'image' as const : 'video' as const, url: finalUrl });
            } else {
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });

        if (result) {
          validResults.push(result);
        }
      }
      
      if (validResults.length > 0) {
        // Automatically prepend to local uploaded media library AND select them
        setLocalUploadedMedia(prev => [...validResults, ...prev]);
        setTempSelectedMedia(prev => [...prev, ...validResults]);
        // Switch to 'my-photos' tab so they can see their newly uploaded photos
        setActiveMediaTab('my-photos');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompressing(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const confirmMediaSelection = () => {
    setDraftMedia(tempSelectedMedia);
    setShowMediaPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col pt-12">
      <div className="px-4 py-2 border-b border-apple-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative z-50">
            <button onClick={handleBackClick} className="p-1 -ml-1 flex items-center justify-center active:scale-95 transition-transform">
              <ArrowLeft size={24} className="text-apple-gray-400" />
            </button>
            
            {showBackOptions && (
              <>
                <div 
                  className="fixed inset-0 bg-transparent" 
                  onClick={(e) => { e.stopPropagation(); setShowBackOptions(false); }} 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-apple-lg border border-apple-gray-100 overflow-hidden z-[60]"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); onBack(); }}
                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-apple-gray-50 flex items-center gap-3"
                  >
                    <ArrowLeft size={16} /> 返回聊天列表
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onBackToTrip?.(room!.tripId!); }}
                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-apple-gray-50 flex items-center gap-3 border-t border-apple-gray-50"
                  >
                    <Plane size={16} /> 返回徵文詳情
                  </button>
                </motion.div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-apple-gray-100 overflow-hidden flex items-center justify-center">
               {room?.type === 'group' ? (
                 <Users size={18} className="text-apple-blue" />
               ) : otherUser?.avatarUrl ? (
                 <img src={otherUser.avatarUrl} className="w-full h-full object-cover" />
               ) : null}
            </div>
            <span className="font-semibold text-sm">
              {room?.type === 'group' ? room.name : otherUser?.displayName}
            </span>
          </div>
        </div>
      </div>
      
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar bg-[#FAFAFA]">
        {messages.map((m, index) => {
          const isMe = m.senderId === user?.uid;
          const sender = participantProfiles[m.senderId];
          const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== m.senderId);
          const msgTime = formatMsgTime(m.createdAt);
          
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-apple-gray-100 flex-shrink-0 overflow-hidden mb-1 border border-apple-gray-100">
                  {showAvatar && sender?.avatarUrl ? (
                    <img src={sender.avatarUrl} className="w-full h-full object-cover" />
                  ) : showAvatar ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-apple-gray-400 font-bold">
                      {sender?.displayName?.[0] || '?'}
                    </div>
                  ) : null}
                </div>
              )}

              <div className={`flex flex-col max-w-[80%] space-y-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && showAvatar && room?.type === 'group' && (
                  <span className="text-[10px] text-apple-gray-400 ml-1 font-medium">{sender?.displayName}</span>
                )}
                
                <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {m.poll ? (
                    <PollCard 
                      messageId={m.id}
                      poll={m.poll}
                      currentUserId={user?.uid}
                      msgTime={msgTime}
                      isMe={isMe}
                      onVote={(optionId) => handleVotePollOption(m.id, m.poll!, optionId)}
                      onViewVotes={() => setViewingVotesPoll({ messageId: m.id, poll: m.poll! })}
                    />
                  ) : m.text ? (
                    <>
                      <div 
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-[#E6F5FF] text-[#2A2B2A] border border-[#CCE8FF] shadow-xs rounded-tr-xs' 
                            : 'bg-white text-[#2A2B2A] border border-apple-gray-100 shadow-xs rounded-tl-xs'
                        }`}
                      >
                        <div className="break-words whitespace-pre-wrap">{m.text}</div>
                      </div>
                      
                      {msgTime && (
                        <span className="text-[10px] text-apple-gray-300 font-medium whitespace-nowrap mb-0.5">
                          {msgTime}
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
                
                {m.mediaList && m.mediaList.length > 0 && (
                  <LineImageGrid 
                    mediaList={m.mediaList} 
                    isMe={isMe} 
                    onMediaClick={(url) => handleMediaClickInChat(url)} 
                    onMediaLongPress={(url) => setLongPressedMediaUrl(url)} 
                  />
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected previews bar just above input */}
      {draftMedia.length > 0 && (
        <div className="px-4 py-2 border-t border-apple-gray-100 bg-[#E6F5FF]/40 flex gap-2 overflow-x-auto no-scrollbar">
          {draftMedia.map((media, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#CCE8FF] flex-shrink-0 bg-white shadow-apple-xs">
              {media.type === 'image' ? (
                <img src={media.url} className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-full h-full">
                  <video src={media.url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play size={14} className="text-white fill-white" />
                  </div>
                </div>
              )}
              <button 
                onClick={() => setDraftMedia(prev => prev.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message input & actions area */}
      <div className="p-3 safe-bottom border-t border-apple-gray-100 bg-white shadow-apple-sm">
        <div className="flex items-center gap-2 bg-[#F3F5F7] rounded-full px-3 py-1.5 border border-apple-gray-100/80 focus-within:border-[#00C2D1]/40 focus-within:bg-white focus-within:shadow-xs transition-all">
          {/* WhatsApp-style Plus (+) Button for Attachments */}
          <button 
            type="button"
            onClick={() => setShowAttachmentSheet(prev => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              showAttachmentSheet 
                ? 'bg-apple-gray-200 text-apple-gray-800 rotate-45' 
                : 'text-apple-gray-500 hover:text-apple-gray-800 hover:bg-black/5 active:scale-95'
            }`}
            title="附加選單"
          >
            <Plus size={20} className="stroke-[2.5]" />
          </button>

          <input 
            value={text} 
            onChange={e => setText(e.target.value)}
            placeholder="輸入訊息..."
            className="flex-1 bg-transparent border-none text-sm text-[#2A2B2A] placeholder:text-apple-gray-400 focus:outline-none px-1 py-1"
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          />

          {/* Upward Arrow Send Button */}
          <button 
            type="button"
            onClick={sendMsg} 
            disabled={isSending || (!text.trim() && draftMedia.length === 0)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              isSending || (!text.trim() && draftMedia.length === 0)
                ? 'bg-apple-gray-200 text-white cursor-not-allowed' 
                : 'bg-[#00C2D1] text-white active:scale-95 shadow-xs hover:bg-[#00b0bd]'
            }`}
          >
            <ArrowUp size={20} className={`stroke-[2.5] ${isSending ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hidden File Input for document/file selection */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

      {/* WhatsApp / iOS Style Attachment Drawer Sheet */}
      <AnimatePresence>
        {showAttachmentSheet && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            {/* Dark Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttachmentSheet(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-xs"
            />

            {/* Bottom Sheet Card */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 bg-[#F4F5F7] rounded-t-[32px] pt-3 pb-8 px-4 shadow-2xl border-t border-white/60 max-w-lg mx-auto w-full"
            >
              {/* Top Handle Bar */}
              <div className="w-9 h-1 bg-apple-gray-300 rounded-full mx-auto mb-4 opacity-80" />

              {/* 7 Rules Grid */}
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 px-2">
                {/* 1. 圖片 */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowAttachmentSheet(false);
                    handleMediaClick();
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-12 rounded-[20px] bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#00A3FF] group-active:scale-95 transition-transform">
                    <ImageIcon size={24} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] font-medium text-apple-gray-600">圖片</span>
                </button>

                {/* 2. 檔案 */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowAttachmentSheet(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-12 rounded-[20px] bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#0284C7] group-active:scale-95 transition-transform">
                    <FileText size={24} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] font-medium text-apple-gray-600">檔案</span>
                </button>

                {/* 3. 地點 */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowAttachmentSheet(false);
                    setShowLocationModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-12 rounded-[20px] bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#10B981] group-active:scale-95 transition-transform">
                    <MapPin size={24} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] font-medium text-apple-gray-600">地點</span>
                </button>

                {/* 4. 行程 */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowAttachmentSheet(false);
                    setShowItineraryModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-12 rounded-[20px] bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#F43F5E] group-active:scale-95 transition-transform">
                    <Calendar size={24} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] font-medium text-apple-gray-600">行程</span>
                </button>

                {/* 5. 記帳 */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowAttachmentSheet(false);
                    setShowExpenseModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-12 rounded-[20px] bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#F59E0B] group-active:scale-95 transition-transform">
                    <Wallet size={24} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] font-medium text-apple-gray-600">記帳</span>
                </button>

                {/* 6. 投票 */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowAttachmentSheet(false);
                    setShowPollModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-12 rounded-[20px] bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#F97316] group-active:scale-95 transition-transform">
                    <BarChart2 size={24} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] font-medium text-apple-gray-600">投票</span>
                </button>

                {/* 7. 抽籤 */}
                <button 
                  type="button"
                  onClick={() => {
                    setShowAttachmentSheet(false);
                    setShowDrawModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-12 rounded-[20px] bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#8B5CF6] group-active:scale-95 transition-transform">
                    <Dices size={24} className="stroke-[2.2]" />
                  </div>
                  <span className="text-[12px] font-medium text-apple-gray-600">抽籤</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. 地點 Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-apple-gray-100 relative"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-[#10B981]">
                  <MapPin size={22} className="stroke-[2.2]" />
                  <h3 className="font-bold text-apple-gray-800 text-base">分享地點</h3>
                </div>
                <button onClick={() => setShowLocationModal(false)} className="text-apple-gray-400 hover:text-apple-gray-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-apple-gray-400 mb-3">點選常用景點，或自訂發送地址：</p>

              <div className="space-y-2 mb-4">
                {[
                  { name: '📍 台北 101 觀景台', addr: '台北市信義區信義路五段7號' },
                  { name: '📍 關西國際機場 (KIX)', addr: '大阪府泉佐野市泉州空港北1' },
                  { name: '📍 京都清水寺', addr: '京都府京都市東山區清水1丁目294' },
                  { name: '📍 東京鐵塔', addr: '東京都港區芝公園4丁目2-8' },
                ].map((spot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sendCustomSystemCard(`📍 地點分享：${spot.name}\n地址：${spot.addr}`);
                      setShowLocationModal(false);
                    }}
                    className="w-full text-left p-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#F0FDF4] border border-apple-gray-100 hover:border-[#10B981]/30 transition-all text-xs"
                  >
                    <div className="font-bold text-apple-gray-700">{spot.name}</div>
                    <div className="text-[11px] text-apple-gray-400 mt-0.5">{spot.addr}</div>
                  </button>
                ))}
              </div>

              <div className="border-t border-apple-gray-100 pt-3 space-y-2">
                <input 
                  value={customLocationName}
                  onChange={e => setCustomLocationName(e.target.value)}
                  placeholder="自訂地點名稱 (如: 飯店大廳)"
                  className="w-full h-9 bg-apple-gray-50 rounded-xl px-3 text-xs focus:outline-none focus:bg-white border border-transparent focus:border-[#10B981]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customLocationName.trim()) {
                      sendCustomSystemCard(`📍 地點分享：${customLocationName}`);
                      setCustomLocationName('');
                      setShowLocationModal(false);
                    }
                  }}
                  disabled={!customLocationName.trim()}
                  className="w-full h-10 rounded-xl bg-[#10B981] text-white font-bold text-xs hover:bg-[#059669] disabled:opacity-50 transition-colors"
                >
                  發送自訂地點
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. 行程 Modal */}
      <AnimatePresence>
        {showItineraryModal && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-apple-gray-100 relative"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-[#F43F5E]">
                  <Calendar size={22} className="stroke-[2.2]" />
                  <h3 className="font-bold text-apple-gray-800 text-base">分享行程卡</h3>
                </div>
                <button onClick={() => setShowItineraryModal(false)} className="text-apple-gray-400 hover:text-apple-gray-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-apple-gray-600 block mb-1">行程名稱</label>
                  <input 
                    value={itineraryTitle}
                    onChange={e => setItineraryTitle(e.target.value)}
                    placeholder="例: 東京 5 日精華之旅"
                    className="w-full h-10 bg-apple-gray-50 rounded-xl px-3 text-xs focus:outline-none focus:bg-white border border-apple-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-apple-gray-600 block mb-1">重點細節 / 當日安排</label>
                  <textarea 
                    value={itineraryDetail}
                    onChange={e => setItineraryDetail(e.target.value)}
                    placeholder="例: Day 2 清水寺 ➔ 祇園 ➔ 鴨川晚餐"
                    rows={3}
                    className="w-full bg-apple-gray-50 rounded-xl p-3 text-xs focus:outline-none focus:bg-white border border-apple-gray-100 resize-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (itineraryTitle.trim()) {
                    sendCustomSystemCard(`🗓️ 行程分享：【${itineraryTitle}】\n${itineraryDetail}`);
                    setShowItineraryModal(false);
                  }
                }}
                className="w-full h-10 rounded-xl bg-[#F43F5E] text-white font-bold text-xs hover:bg-[#E11D48] transition-colors"
              >
                發送行程至聊天室
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. 記帳 Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-apple-gray-100 relative"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-[#F59E0B]">
                  <Wallet size={22} className="stroke-[2.2]" />
                  <h3 className="font-bold text-apple-gray-800 text-base">新增記帳紀錄</h3>
                </div>
                <button onClick={() => setShowExpenseModal(false)} className="text-apple-gray-400 hover:text-apple-gray-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-bold text-apple-gray-600 block mb-1">消費項目</label>
                  <input 
                    value={expenseTitle}
                    onChange={e => setExpenseTitle(e.target.value)}
                    placeholder="例: 居酒屋晚餐分帳"
                    className="w-full h-10 bg-apple-gray-50 rounded-xl px-3 text-xs focus:outline-none focus:bg-white border border-apple-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-apple-gray-600 block mb-1">金額 ($ NTD)</label>
                  <input 
                    type="number"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    placeholder="例: 1200"
                    className="w-full h-10 bg-apple-gray-50 rounded-xl px-3 text-xs focus:outline-none focus:bg-white border border-apple-gray-100 font-bold text-apple-gray-800"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (expenseTitle.trim() && expenseAmount) {
                    sendCustomSystemCard(`💰 記帳紀錄：${expenseTitle} $${expenseAmount} (由 ${user?.displayName || '成員'} 先墊付)`);
                    setExpenseTitle('');
                    setExpenseAmount('');
                    setShowExpenseModal(false);
                  }
                }}
                disabled={!expenseTitle.trim() || !expenseAmount}
                className="w-full h-10 rounded-xl bg-[#F59E0B] text-white font-bold text-xs hover:bg-[#D97706] disabled:opacity-50 transition-colors"
              >
                新增並發送記帳
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. 投票 Modal (WhatsApp / iOS Style Create Poll) */}
      <AnimatePresence>
        {showPollModal && (
          <div className="fixed inset-0 z-[115] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-[#F4F5F7] rounded-t-[32px] sm:rounded-3xl max-w-md w-full p-5 shadow-2xl border border-apple-gray-100 max-h-[90vh] overflow-y-auto no-scrollbar relative flex flex-col"
            >
              {/* Header Bar */}
              <div className="flex justify-between items-center mb-5">
                <button 
                  type="button"
                  onClick={() => setShowPollModal(false)} 
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-apple-gray-700 shadow-2xs hover:bg-apple-gray-100 active:scale-95 transition-all"
                >
                  <X size={20} />
                </button>
                
                <h3 className="font-bold text-apple-gray-800 text-base">Create poll (建立投票)</h3>

                <button
                  type="button"
                  onClick={handleCreateAndSendPoll}
                  className="px-4 py-1.5 rounded-full bg-[#10B981] text-white font-bold text-sm shadow-2xs hover:bg-[#059669] active:scale-95 transition-all"
                >
                  Send (發送)
                </button>
              </div>

              {/* QUESTION Section */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-apple-gray-500 uppercase tracking-wider mb-1.5 px-1">
                  QUESTION (投票主題)
                </div>
                <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-black/5">
                  <input 
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="Ask question (輸入投票主題...)"
                    className="w-full text-sm font-medium text-apple-gray-800 placeholder:text-apple-gray-300 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* OPTIONS Section */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-apple-gray-500 uppercase tracking-wider mb-1.5 px-1">
                  OPTIONS (投票選項)
                </div>
                <div className="bg-white rounded-2xl shadow-2xs border border-black/5 divide-y divide-apple-gray-100 overflow-hidden">
                  {pollOptionInputs.map((optionVal, idx) => (
                    <div key={idx} className="flex items-center px-3.5 py-3 gap-2">
                      <input 
                        value={optionVal}
                        onChange={e => handleUpdatePollOption(idx, e.target.value)}
                        placeholder={`Add option ${idx + 1}`}
                        className="flex-1 text-sm text-apple-gray-800 placeholder:text-apple-gray-300 focus:outline-none bg-transparent"
                      />
                      {pollOptionInputs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(idx)}
                          className="text-apple-gray-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add Option Button */}
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    className="w-full py-3 px-3.5 text-xs font-bold text-[#00C2D1] hover:bg-black/2 active:bg-black/5 flex items-center gap-1.5 transition-colors text-left"
                  >
                    <Plus size={16} />
                    <span>新增選項 (Add option)</span>
                  </button>
                </div>
              </div>

              {/* SETTINGS / SWITCHES Section */}
              <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-black/5 space-y-4 mb-2">
                {/* Allow multiple answers */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-apple-gray-800">Allow multiple answers (允許複選)</span>
                  <button
                    type="button"
                    onClick={() => setPollAllowMultiple(prev => !prev)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                      pollAllowMultiple ? 'bg-[#10B981]' : 'bg-apple-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-2xs transition-transform duration-200 ease-in-out ${
                      pollAllowMultiple ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Set poll end time */}
                <div className="border-t border-apple-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-apple-gray-800">設定投票截止時間</span>
                    <button
                      type="button"
                      onClick={() => setPollSetDeadline(prev => !prev)}
                      className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                        pollSetDeadline ? 'bg-[#10B981]' : 'bg-apple-gray-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-2xs transition-transform duration-200 ease-in-out ${
                        pollSetDeadline ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  {pollSetDeadline && (
                    <div className="mt-2.5">
                      <input 
                        type="datetime-local"
                        value={pollDeadline}
                        onChange={e => setPollDeadline(e.target.value)}
                        className="w-full h-10 bg-apple-gray-50 border border-apple-gray-200 rounded-xl px-3 text-xs text-apple-gray-800 font-medium focus:outline-none focus:bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Anonymous poll */}
                <div className="border-t border-apple-gray-100 pt-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-apple-gray-800">匿名投票</div>
                    <div className="text-[11px] text-apple-gray-400">隱藏投票者身分（其他使用者看不到誰投哪一個選項）</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPollIsAnonymous(prev => !prev)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                      pollIsAnonymous ? 'bg-[#10B981]' : 'bg-apple-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-2xs transition-transform duration-200 ease-in-out ${
                      pollIsAnonymous ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Votes Modal */}
      <AnimatePresence>
        {viewingVotesPoll && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-apple-gray-100 relative max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-apple-gray-800 text-base">投票詳細統計</h3>
                <button onClick={() => setViewingVotesPoll(null)} className="text-apple-gray-400 hover:text-apple-gray-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4">
                <div className="font-bold text-base text-apple-gray-900">{viewingVotesPoll.poll.question}</div>
                <div className="text-xs text-apple-gray-400 mt-0.5">
                  總計 {viewingVotesPoll.poll.options.reduce((s, o) => s + (o.voterIds?.length || 0), 0)} 票
                  {viewingVotesPoll.poll.isAnonymous && ' • 🔒 匿名投票'}
                </div>
              </div>

              {viewingVotesPoll.poll.isAnonymous ? (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 text-center border border-black/5 my-2">
                  <Lock size={28} className="mx-auto text-apple-gray-400 mb-2" />
                  <div className="text-xs font-bold text-apple-gray-700">此投票設為匿名投票</div>
                  <div className="text-[11px] text-apple-gray-400 mt-1">其他使用者無法查看特定成員之個投票選項細節。</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {viewingVotesPoll.poll.options.map(opt => (
                    <div key={opt.id} className="border-b border-apple-gray-100 pb-3 last:border-none">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-sm text-apple-gray-800">{opt.text}</span>
                        <span className="text-xs font-bold text-[#0081d1]">{opt.voterIds?.length || 0} 票</span>
                      </div>
                      
                      {opt.voterIds && opt.voterIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {opt.voterIds.map(uid => {
                            const p = participantProfiles[uid];
                            return (
                              <div key={uid} className="flex items-center gap-1.5 bg-apple-gray-50 border border-apple-gray-100 rounded-full px-2.5 py-1 text-xs">
                                <div className="w-4 h-4 rounded-full bg-apple-gray-200 overflow-hidden flex items-center justify-center">
                                  {p?.avatarUrl ? (
                                    <img src={p.avatarUrl} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[8px] font-bold text-apple-gray-500">{p?.displayName?.[0] || '?'}</span>
                                  )}
                                </div>
                                <span className="font-medium text-apple-gray-700">{p?.displayName || '成員'}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-apple-gray-300 italic">尚無人投票</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. 抽籤 Modal */}
      <AnimatePresence>
        {showDrawModal && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-apple-gray-100 relative"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-[#8B5CF6]">
                  <Dices size={22} className="stroke-[2.2]" />
                  <h3 className="font-bold text-apple-gray-800 text-base">團隊幸運抽籤</h3>
                </div>
                <button onClick={() => setShowDrawModal(false)} className="text-apple-gray-400 hover:text-apple-gray-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-apple-gray-600 block mb-1">抽籤主題</label>
                  <input 
                    value={drawTopic}
                    onChange={e => setDrawTopic(e.target.value)}
                    placeholder="例: 今天由誰來買晚餐？"
                    className="w-full h-9 bg-apple-gray-50 rounded-xl px-3 text-xs focus:outline-none focus:bg-white border border-apple-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-apple-gray-600 block mb-1">參與人員 / 名單 (逗號分隔)</label>
                  <input 
                    value={drawCandidatesText}
                    onChange={e => setDrawCandidatesText(e.target.value)}
                    placeholder="例: 方方老Baby, 小明, Phoebe"
                    className="w-full h-9 bg-apple-gray-50 rounded-xl px-3 text-xs focus:outline-none focus:bg-white border border-apple-gray-100"
                  />
                </div>

                {/* Result Display Box */}
                <div className="bg-[#F5F3FF] rounded-2xl p-4 border border-[#8B5CF6]/20 text-center flex flex-col items-center justify-center min-h-[80px]">
                  {isDrawing ? (
                    <div className="flex items-center gap-2 text-[#8B5CF6] font-extrabold text-lg animate-bounce">
                      <Sparkles size={20} />
                      <span>{drawResult || '抽籤中...'}</span>
                    </div>
                  ) : drawResult ? (
                    <div>
                      <div className="text-[11px] text-[#8B5CF6] font-bold">🎉 抽籤結果</div>
                      <div className="text-xl font-black text-apple-gray-800 mt-0.5">{drawResult}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-apple-gray-400">按下下方按鈕開始隨機抽籤</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRunDraw}
                  disabled={isDrawing}
                  className="flex-1 h-10 rounded-xl bg-[#8B5CF6] text-white font-bold text-xs hover:bg-[#7C3AED] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Dices size={16} />
                  <span>{drawResult ? '重新抽籤' : '開始抽籤'}</span>
                </button>

                {drawResult && (
                  <button
                    type="button"
                    onClick={() => {
                      sendCustomSystemCard(`🎲 抽籤結果：【${drawTopic}】\n🎉 恭喜幸運兒：「${drawResult}」！`);
                      setDrawResult(null);
                      setShowDrawModal(false);
                    }}
                    className="flex-1 h-10 rounded-xl bg-apple-gray-800 text-white font-bold text-xs hover:bg-black transition-colors"
                  >
                    發送結果
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* iOS-style Album Read Authorization Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-xs w-full shadow-apple-lg overflow-hidden flex flex-col items-center p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-apple-blue/10 text-apple-blue flex items-center justify-center mb-4">
                <ShieldCheck size={28} />
              </div>
              <h3 className="font-black text-apple-gray-900 text-base mb-2">「旅友」想要讀取您的相簿資料</h3>
              <p className="text-xs text-apple-gray-400 font-light mb-6 leading-relaxed">
                此權限將用於在群組或個人聊天室中，分享您的旅遊照片與影片，豐富與伴侶的互動回憶。
              </p>
              <div className="w-full flex flex-col border-t border-apple-gray-50">
                <button 
                  onClick={grantPermission}
                  className="w-full py-3.5 text-sm font-bold text-apple-blue hover:bg-apple-gray-50 transition-colors border-b border-apple-gray-50"
                >
                  允許讀取所有照片與影片
                </button>
                <button 
                  onClick={denyPermission}
                  className="w-full py-3.5 text-sm font-medium text-red-500 hover:bg-apple-gray-50 transition-colors"
                >
                  不允許
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern In-App Media Selector Sheet (Supports multi-selection & real system uploads) */}
      <AnimatePresence>
        {showMediaPicker && (
          <div className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-xs flex flex-col justify-end">
            <div className="fixed inset-0 bg-transparent" onClick={() => setShowMediaPicker(false)} />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-3xl shadow-apple-lg max-h-[85vh] flex flex-col z-20 relative overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-apple-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-apple-gray-900">手機相簿</span>
                  <span className="text-xs bg-apple-gray-100 text-apple-gray-500 px-2 py-0.5 rounded-full font-medium">
                    已選擇 {tempSelectedMedia.length} 項
                  </span>
                  {isCompressing && (
                    <span className="text-[10px] text-apple-blue font-bold animate-pulse bg-apple-blue/5 px-2.5 py-0.5 rounded-full">
                      處理中...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => !isCompressing && fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
                      isCompressing 
                        ? 'bg-apple-gray-100 text-apple-gray-400 cursor-not-allowed' 
                        : 'text-apple-blue bg-apple-blue/5 hover:bg-apple-blue/10'
                    }`}
                  >
                    <Plus size={14} /> 從系統上傳
                  </button>
                  <button 
                    onClick={() => setShowMediaPicker(false)}
                    className="p-1 rounded-full bg-apple-gray-50 text-apple-gray-400 hover:text-apple-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex px-6 border-b border-apple-gray-50 bg-apple-gray-50/50">
                <button
                  onClick={() => setActiveMediaTab('my-photos')}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
                    activeMediaTab === 'my-photos'
                      ? 'border-apple-blue text-apple-blue'
                      : 'border-transparent text-apple-gray-400 hover:text-apple-gray-600'
                  }`}
                >
                  手機相片 ({localUploadedMedia.length})
                </button>
                <button
                  onClick={() => setActiveMediaTab('samples')}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
                    activeMediaTab === 'samples'
                      ? 'border-apple-blue text-apple-blue'
                      : 'border-transparent text-apple-gray-400 hover:text-apple-gray-600'
                  }`}
                >
                  系統範本 (9)
                </button>
              </div>

              {/* Hidden System File Input */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleSystemFileUpload}
                multiple 
                accept="image/*,video/*"
                className="hidden"
              />

              {/* Media Album Container */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 no-scrollbar max-h-[50vh]">
                {activeMediaTab === 'my-photos' ? (
                  localUploadedMedia.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-apple-gray-50 flex items-center justify-center text-apple-gray-400 mb-4 shadow-inner">
                        <ImageIcon size={32} className="text-apple-gray-300" />
                      </div>
                      <h4 className="text-sm font-bold text-apple-gray-700 mb-1">您的手機相簿</h4>
                      <p className="text-xs text-apple-gray-400 max-w-[280px] leading-relaxed mb-6">
                        由於瀏覽器安全隱私限制，網頁無法直接讀取您的手機相簿。請點擊上方「從系統上傳」按鈕，即可選取您手機中的照片，同步到此處選取傳送！
                      </p>
                      <button
                        onClick={() => !isCompressing && fileInputRef.current?.click()}
                        disabled={isCompressing}
                        className="flex items-center gap-2 bg-apple-blue text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-apple-blue/90 active:scale-95 transition-all shadow-apple-sm disabled:opacity-50"
                      >
                        <Plus size={16} /> 上傳本機相片
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {localUploadedMedia.map((item, idx) => {
                        const selectIndex = tempSelectedMedia.findIndex(m => m.url === item.url);
                        const isSelected = selectIndex !== -1;
                        return (
                          <div 
                            key={`custom-${idx}`}
                            onClick={() => toggleMediaSelection(item)}
                            className="aspect-square w-full relative rounded-2xl overflow-hidden border border-apple-blue/20 bg-apple-gray-50 cursor-pointer active:scale-95 transition-all flex items-center justify-center"
                          >
                            {item.type === 'image' ? (
                              <img src={item.url} className="w-full h-full object-cover aspect-square" />
                            ) : (
                              <div className="w-full h-full relative aspect-square">
                                <video src={item.url} className="w-full h-full object-cover aspect-square" muted />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                  <Play size={20} className="text-white fill-white opacity-80" />
                                </div>
                              </div>
                            )}
                            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                              isSelected 
                              ? 'bg-apple-blue border-white text-white scale-110 shadow-apple-sm animate-scale-up' 
                              : 'bg-black/20 border-white/50 text-transparent'
                            }`}>
                              {isSelected ? selectIndex + 1 : ''}
                            </div>
                            <div className="absolute bottom-1.5 left-2 bg-apple-blue/70 backdrop-blur-xs text-[10px] text-white px-1.5 py-0.5 rounded-md font-bold">
                              本機上傳
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_ALBUM_MEDIA.map((item, idx) => {
                      const selectIndex = tempSelectedMedia.findIndex(m => m.url === item.url);
                      const isSelected = selectIndex !== -1;
                      return (
                        <div 
                          key={idx}
                          onClick={() => toggleMediaSelection(item)}
                          className="aspect-square w-full relative rounded-2xl overflow-hidden border border-apple-gray-100 bg-apple-gray-50 cursor-pointer group active:scale-95 transition-all flex items-center justify-center"
                        >
                          {item.type === 'image' ? (
                            <img src={item.url} className="w-full h-full object-cover aspect-square transition-transform group-hover:scale-105 duration-300" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full relative aspect-square">
                              <video src={item.url} className="w-full h-full object-cover aspect-square" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <Play size={20} className="text-white fill-white opacity-80" />
                              </div>
                            </div>
                          )}
                          
                          {/* Grid Item selection index badge */}
                          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                            isSelected 
                            ? 'bg-apple-blue border-white text-white scale-110 shadow-apple-sm animate-scale-up' 
                            : 'bg-black/20 border-white/50 text-transparent'
                          }`}>
                            {isSelected ? selectIndex + 1 : ''}
                          </div>

                          {/* Item label */}
                          <div className="absolute bottom-1.5 left-2 bg-black/40 backdrop-blur-xs text-[10px] text-white px-1.5 py-0.5 rounded-md font-medium">
                            {item.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm Actions Bar */}
              <div className="p-6 border-t border-apple-gray-100 bg-white flex gap-4 relative z-10">
                <button 
                  onClick={() => setShowMediaPicker(false)}
                  disabled={isCompressing}
                  className="flex-1 py-3 bg-white border border-apple-gray-100 rounded-xl text-sm font-semibold text-apple-gray-500 hover:bg-apple-gray-50 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button 
                  onClick={confirmMediaSelection}
                  disabled={isCompressing}
                  className="flex-1 py-3 bg-apple-gray-600 text-white rounded-xl text-sm font-black hover:bg-apple-gray-900 active:scale-98 transition-all disabled:bg-apple-gray-300 disabled:cursor-not-allowed"
                >
                  {isCompressing ? '處理中...' : `確認選擇 (${tempSelectedMedia.length})`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp-Style Lightbox Gallery */}
      <AnimatePresence>
        {galleryInitialIndex !== null && (
          <WhatsAppGalleryModal
            mediaList={allChatMedia}
            initialIndex={galleryInitialIndex}
            onClose={() => setGalleryInitialIndex(null)}
            onDownload={(url) => downloadMedia(url)}
          />
        )}
      </AnimatePresence>

      {/* Long Press Action Sheet Modal */}
      <AnimatePresence>
        {longPressedMediaUrl && (
          <div 
            className="fixed inset-0 z-[130] bg-black/40 flex items-end justify-center sm:items-center p-4 transition-opacity"
            onClick={() => setLongPressedMediaUrl(null)}
          >
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-apple-lg border border-apple-gray-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-apple-gray-50 text-center">
                <span className="text-xs font-bold text-apple-gray-300 uppercase tracking-widest block mb-1">照片與影片選項</span>
                <span className="text-[11px] text-apple-gray-400">您可以將此媒體儲存至本機裝置</span>
              </div>
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    downloadMedia(longPressedMediaUrl);
                    setLongPressedMediaUrl(null);
                  }}
                  className="w-full py-4 text-center text-sm font-semibold text-apple-gray-600 hover:bg-apple-gray-50 active:bg-apple-gray-100 border-b border-apple-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} className="text-apple-blue" />
                  <span>儲存至本地裝置</span>
                </button>
                <button 
                  onClick={() => setLongPressedMediaUrl(null)}
                  className="w-full py-4 text-center text-sm font-bold text-red-500 hover:bg-apple-gray-50 active:bg-apple-gray-100 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Success Toast */}
      <AnimatePresence>
        {showSaveSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-black/85 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-apple-lg flex items-center gap-2"
          >
            <div className="w-4 h-4 rounded-full bg-apple-blue flex items-center justify-center text-[10px] text-white">✓</div>
            <span>媒體已成功儲存！</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ChatPage: React.FC<{ initialRoomId: string | null, onAvatarClick: (userId: string) => void, onBackToTrip?: (tripId: string) => void }> = ({ initialRoomId, onAvatarClick, onBackToTrip }) => {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId);
  const [showSearch, setShowSearch] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);

  useEffect(() => {
    setSelectedRoomId(initialRoomId);
  }, [initialRoomId]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chatRooms'), where('participants', 'array-contains', user.uid));
    return onSnapshot(q, (s) => {
      const mapped = s.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
      mapped.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'string') return new Date(val).getTime();
          if (val.toDate) return val.toDate().getTime();
          return 0;
        };
        return getTime(b.lastUpdatedAt) - getTime(a.lastUpdatedAt);
      });
      setRooms(mapped);
    });
  }, [user]);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const q = query(collection(db, 'users'), where('username', '==', searchId.trim().toLowerCase()));
      const s = await getDocs(q);
      if (!s.empty) {
        setSearchResult(s.docs[0].data() as UserProfile);
      } else {
        alert('找不到該用戶');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriendFromChat = async (targetId: string) => {
    if (!user) return;
    try {
      // Check if already sent
      const q = query(collection(db, 'friendRequests'), 
        where('senderId', '==', user.uid), 
        where('receiverId', '==', targetId),
        where('status', '==', 'pending')
      );
      const s = await getDocs(q);
      if (!s.empty) {
        alert('已發送過請求');
        return;
      }

      await addDoc(collection(db, 'friendRequests'), {
        senderId: user.uid,
        receiverId: targetId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('好友請求已發送');
      setShowSearch(false);
      setSearchId('');
      setSearchResult(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[100] bg-white pt-12">
            <div className="px-6 flex items-center justify-between mb-4 border-b border-apple-gray-50 pb-4">
              <h2 className="text-lg font-bold">尋找好友</h2>
              <button onClick={() => setShowSearch(false)} className="text-apple-gray-600 font-medium">關閉</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="輸入用戶 ID"
                  value={searchId}
                  onChange={e => setSearchId(e.target.value)}
                  className="flex-1 bg-apple-gray-50 rounded-xl px-4 text-sm focus:outline-none h-11"
                />
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-apple-gray-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
                >
                  搜尋
                </button>
              </div>

              {searchResult && (
                <div className="flex items-center justify-between p-4 bg-apple-gray-50 rounded-2xl border border-apple-gray-100">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setShowSearch(false); onAvatarClick(searchResult.uid); }}>
                    <div className="w-12 h-12 rounded-full bg-white overflow-hidden border border-apple-gray-100">
                      {searchResult.avatarUrl ? <img src={searchResult.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-apple-gray-200">?</div>}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{searchResult.displayName}</div>
                      <div className="text-[10px] text-apple-gray-300">@{searchResult.username}</div>
                    </div>
                  </div>
                  {profile?.friends?.includes(searchResult.uid) ? (
                    <span className="text-xs text-apple-gray-300 font-medium">已是好友</span>
                  ) : searchResult.uid === user?.uid ? (
                    <span className="text-xs text-apple-gray-300 font-medium">你自己</span>
                  ) : (
                    <button 
                      onClick={() => handleAddFriendFromChat(searchResult.uid)}
                      className="text-white bg-apple-blue px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      加入好友
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">聊天室</h1>
        <button onClick={() => setShowSearch(true)} className="text-apple-blue active:scale-90 transition-transform"><UserPlus size={24} strokeWidth={2.5} /></button>
      </div>
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-300" size={16} />
          <input type="text" placeholder="搜尋好友或聊天記錄" className="w-full h-10 bg-apple-gray-50 rounded-xl pl-11 pr-4 text-sm focus:outline-none" />
        </div>
      </div>
      <div className="flex-1 pb-24">
        {rooms.length > 0 ? (
          rooms.map(room => (
            <ChatRoomItem key={room.id} room={room} onClick={() => setSelectedRoomId(room.id)} />
          ))
        ) : (
          <div className="py-20 text-center text-apple-gray-300 font-light">尚無聊天記錄</div>
        )}
      </div>

      <AnimatePresence>
        {selectedRoomId && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-[100]">
             <ChatView 
               roomId={selectedRoomId} 
               onBack={() => setSelectedRoomId(null)} 
               onBackToTrip={(tid) => {
                 setSelectedRoomId(null);
                 onBackToTrip?.(tid);
               }}
             />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
