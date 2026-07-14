import React, { useEffect, useState, useRef } from 'react';
import { Search, UserPlus, Send, ArrowLeft, Users, Plane, Image as ImageIcon, Video, Plus, X, Lock, Play, Camera, ShieldCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, getDoc, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { ChatRoom, Message, UserProfile } from '../types';
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
  const [fullScreenMedia, setFullScreenMedia] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, index) => {
          const isMe = m.senderId === user?.uid;
          const sender = participantProfiles[m.senderId];
          const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== m.senderId);
          
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-apple-gray-100 flex-shrink-0 overflow-hidden mb-1">
                  {showAvatar && sender?.avatarUrl ? (
                    <img src={sender.avatarUrl} className="w-full h-full object-cover" />
                  ) : showAvatar && (
                    <div className="w-full h-full flex items-center justify-center text-xs text-apple-gray-300 font-bold">
                      {sender?.displayName?.[0] || '?'}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col max-w-[75%]">
                {!isMe && showAvatar && room?.type === 'group' && (
                  <span className="text-[10px] text-apple-gray-400 ml-1 mb-1">{sender?.displayName}</span>
                )}
                <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-apple-gray-600 text-white rounded-tr-none' : 'bg-apple-gray-50 text-apple-gray-600 rounded-tl-none'} space-y-2`}>
                  {m.text && <div className="break-words whitespace-pre-wrap">{m.text}</div>}
                  
                  {/* Media attachment block within bubble */}
                  {m.mediaList && m.mediaList.length > 0 && (
                    <div className={`grid gap-1.5 mt-1 ${m.mediaList.length === 1 ? 'grid-cols-1' : m.mediaList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {m.mediaList.map((media, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setFullScreenMedia(media.url)}
                          className="relative rounded-xl overflow-hidden border border-black/5 bg-black/5 cursor-pointer hover:opacity-90 transition-opacity aspect-square w-24 h-24"
                        >
                          {media.type === 'image' ? (
                            <img src={media.url} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="relative w-full h-full">
                              <video src={media.url} className="w-full h-full object-cover rounded-xl" controls={false} />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">影片</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected previews bar just above input */}
      {draftMedia.length > 0 && (
        <div className="px-4 py-2 border-t border-apple-gray-50 bg-apple-gray-50/50 flex gap-2 overflow-x-auto no-scrollbar">
          {draftMedia.map((media, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-apple-gray-100 flex-shrink-0 bg-white shadow-apple-xs">
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
      <div className="p-4 safe-bottom border-t border-apple-gray-50 flex items-center gap-2 bg-white">
        {/* Attachment Button */}
        <button 
          onClick={handleMediaClick}
          className="w-10 h-10 rounded-full bg-apple-gray-50 flex items-center justify-center text-apple-gray-600 active:scale-90 transition-transform"
        >
          <ImageIcon size={20} />
        </button>

        <input 
          value={text} onChange={e => setText(e.target.value)}
          placeholder="輸入訊息..."
          className="flex-1 h-10 bg-apple-gray-50 rounded-full px-4 text-sm focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
        />

        <button 
          onClick={sendMsg} 
          disabled={isSending}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSending ? 'bg-apple-gray-200' : 'bg-apple-gray-600 text-white active:scale-90'}`}
        >
          <Send size={18} className={isSending ? 'animate-pulse' : ''} />
        </button>
      </div>

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

      {/* Full screen lightbox for media */}
      <AnimatePresence>
        {fullScreenMedia && (
          <div 
            className="fixed inset-0 z-[120] bg-black flex items-center justify-center"
            onClick={() => setFullScreenMedia(null)}
          >
            <button 
              onClick={() => setFullScreenMedia(null)}
              className="absolute top-12 right-6 p-2 rounded-full bg-white/10 text-white/80 hover:text-white"
            >
              <X size={24} />
            </button>
            <div className="max-w-full max-h-[85vh] p-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {fullScreenMedia.includes('mixkit.co') || fullScreenMedia.startsWith('data:video/') ? (
                <video src={fullScreenMedia} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-apple-lg" />
              ) : (
                <img src={fullScreenMedia} className="max-w-full max-h-full object-contain rounded-2xl shadow-apple-lg" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>
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
