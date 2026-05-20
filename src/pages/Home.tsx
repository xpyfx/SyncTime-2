import React, { useEffect, useState } from 'react';
import { Search, Plus, Bookmark, EyeOff, ShieldAlert } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, where, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trip, UserProfile, GestureSettings } from '../types';
import { TripCard } from '../components/TripCard';
import { useAuth } from '../context/AuthContext';
import { SwipeableWrapper } from '../components/SwipeableWrapper';
import { motion, AnimatePresence } from 'motion/react';

interface HomeViewProps {
  onAvatarClick: (userId: string) => void;
  onTripClick: (tripId: string) => void;
  onAddClick: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onAvatarClick, onTripClick, onAddClick }) => {
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
      setTrips(data);
      setLoading(false);

      // Fetch authors for search and privacy checks
      const authorIds = Array.from(new Set(data.map(t => t.authorId)));
      const newProfiles = { ...profiles };
      let changed = false;
      for (const id of authorIds) {
        if (!newProfiles[id]) {
          const uSnap = await getDoc(doc(db, 'users', id));
          if (uSnap.exists()) {
            newProfiles[id] = uSnap.data() as UserProfile;
            changed = true;
          }
        }
      }
      if (changed) setProfiles(newProfiles);
    });
  }, []);

  const handleAction = async (trip: Trip, action: '收藏' | '不感興趣' | '檢舉') => {
    if (!user) return;
    
    if (action === '收藏') {
      const saveRef = doc(db, 'users', user.uid, 'savedTrips', trip.id);
      const snap = await getDoc(saveRef);
      if (!snap.exists()) {
        await setDoc(saveRef, { savedAt: serverTimestamp(), tripId: trip.id });
      }
    } else if (action === '不感興趣') {
      await updateDoc(doc(db, 'users', user.uid), {
        hiddenItems: arrayUnion(trip.id)
      });
    } else if (action === '檢舉') {
      if (!confirm('確定要檢舉這則徵人啟事嗎？我們會盡快審核。')) return;
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetId: trip.id,
        targetType: 'tripPost',
        authorId: trip.authorId,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      alert('感謝回報！');
    }
  };

  const getActionConfig = (actionName: string) => {
    switch (actionName) {
      case '收藏': return { icon: Bookmark, color: 'text-red-500', label: '收藏' };
      case '不感興趣': return { icon: EyeOff, color: 'text-black', label: '不感興趣' };
      case '檢舉': return { icon: ShieldAlert, color: 'text-red-600', label: '檢舉' };
      default: return { icon: Bookmark, color: 'text-red-500', label: '收藏' };
    }
  };

  const gestureSettings = profile?.gestureSettings || { homeLeft: '不感興趣', homeRight: '收藏' } as GestureSettings;

  const filteredTrips = trips.filter(trip => {
    // 隐藏逻辑: 如果在 Firestore 中已隱藏，則過濾掉
    if (profile?.hiddenItems?.includes(trip.id)) return false;

    // 1. Privacy Logic
    const isPublic = !trip.isFriendsOnly;
    const isAuthor = user?.uid === trip.authorId;
    const isMember = user?.uid ? trip.members?.includes(user.uid) : false;
    
    // Check if user is a friend of the author
    const authorProfile = profiles[trip.authorId];
    const isFriend = user?.uid && authorProfile?.friends?.includes(user.uid);

    const canSee = isPublic || isAuthor || isMember || isFriend;
    
    if (!canSee) return false;

    // 2. Search Logic
    const s = search.toLowerCase();
    const author = profiles[trip.authorId];
    return (
      trip.country.toLowerCase().includes(s) ||
      trip.cities.some(c => c.toLowerCase().includes(s)) ||
      trip.notes.toLowerCase().includes(s) ||
      (author?.displayName?.toLowerCase() || '').includes(s) ||
      (author?.username?.toLowerCase() || '').includes(s)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-apple-gray-50">
      {/* Header / Search */}
      <div className="sticky top-0 bg-apple-gray-50/80 backdrop-blur-xl z-10 px-5 pt-12 pb-2">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">為您推薦</h1>
          <button 
            onClick={onAddClick}
            className="w-10 h-10 bg-apple-gray-600 rounded-full flex items-center justify-center text-white shadow-apple-sm active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-300 opacity-60" size={16} strokeWidth={2.5} />
          <input
            type="text"
            placeholder="搜尋目的地或旅伴"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-white border border-apple-gray-100 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-apple-gray-200 transition-all placeholder:text-apple-gray-300"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-32">
        {user && (profile?.hiddenItems?.length ?? 0) > 0 && (
          <div className="flex items-center justify-center py-2 mb-4 bg-apple-gray-100/50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[10px] font-bold text-apple-gray-400">已隱藏 {profile?.hiddenItems?.length} 則徵文</span>
            <button 
              onClick={() => {
                const lastHidden = profile?.hiddenItems?.[profile.hiddenItems.length - 1];
                if (lastHidden) updateDoc(doc(db, 'users', user.uid), { hiddenItems: arrayRemove(lastHidden) });
              }}
              className="ml-3 text-[10px] font-black text-apple-blue active:scale-90 transition-transform"
            >
              恢復
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-apple-gray-50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredTrips.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredTrips.map(trip => (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SwipeableWrapper
                  leftAction={{ 
                    ...getActionConfig(gestureSettings.homeLeft), 
                    onTrigger: () => handleAction(trip, gestureSettings.homeLeft) 
                  }}
                  rightAction={{ 
                    ...getActionConfig(gestureSettings.homeRight), 
                    onTrigger: () => handleAction(trip, gestureSettings.homeRight) 
                  }}
                >
                  <TripCard 
                    trip={trip} 
                    onClick={() => onTripClick(trip.id)}
                    onAvatarClick={onAvatarClick}
                    onCommentClick={(e) => {
                      e.stopPropagation();
                      onTripClick(trip.id);
                    }}
                  />
                </SwipeableWrapper>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="py-20 text-center text-apple-gray-300 font-light">
            找不到相關的旅伴資訊
          </div>
        )}
      </div>
    </div>
  );
};
