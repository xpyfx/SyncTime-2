import React, { useEffect, useState } from 'react';
import { Search, Plus, Send, ThumbsUp, Bookmark, EyeOff, ShieldAlert } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { BarPost, UserProfile, GestureSettings } from '../types';
import { BarPostCard } from '../components/BarPostCard';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { SwipeableWrapper } from '../components/SwipeableWrapper';

export const TravelBarView: React.FC<{ onChatClick: (roomId: string) => void }> = ({ onChatClick }) => {
  const [posts, setPosts] = useState<BarPost[]>([]);
  const [activeTab, setActiveTab] = useState<'recommended' | 'friends'>('recommended');
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const [search, setSearch] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'barPosts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BarPost));
      setPosts(data);

      // Fetch authors
      const authorIds = Array.from(new Set(data.map(p => p.authorId)));
      const newAuthors = { ...authors };
      for (const id of authorIds) {
        if (!newAuthors[id]) {
          const uDoc = await getDoc(doc(db, 'users', id));
          if (uDoc.exists()) {
            newAuthors[id] = uDoc.data() as UserProfile;
          }
        }
      }
      setAuthors(newAuthors);
    });
  }, []);

  const handleCreatePost = async () => {
    if (isSubmitting) return;
    if (!newPostContent.trim() || !user) return;
    setIsSubmitting(true);
    const path = 'barPosts';
    try {
      await addDoc(collection(db, path), {
        authorId: user.uid,
        content: newPostContent,
        likesCount: 0,
        commentsCount: 0,
        favoritesCount: 0,
        createdAt: serverTimestamp(),
      });
      setNewPostContent('');
      setIsPosting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (post: BarPost, action: '點讚' | '收藏' | '不感興趣' | '檢舉') => {
    if (!user) return;
    
    if (action === '點讚') {
      const likeDoc = doc(db, 'barPosts', post.id, 'likes', user.uid);
      const isLiked = (await getDoc(likeDoc)).exists();
      if (!isLiked) {
        await setDoc(likeDoc, { createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'barPosts', post.id), { likesCount: increment(1) });
      }
    } else if (action === '收藏') {
      const favRef = doc(db, 'users', user.uid, 'savedPosts', post.id);
      const isFav = (await getDoc(favRef)).exists();
      if (!isFav) {
        await setDoc(favRef, { savedAt: serverTimestamp(), postId: post.id });
        await updateDoc(doc(db, 'barPosts', post.id), { favoritesCount: increment(1) });
      }
    } else if (action === '不感興趣') {
      await updateDoc(doc(db, 'users', user.uid), {
        hiddenItems: arrayUnion(post.id)
      });
    } else if (action === '檢舉') {
      if (!confirm('確定要檢舉這則見聞嗎？我們會盡快審核。')) return;
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetId: post.id,
        targetType: 'barPost',
        authorId: post.authorId,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      alert('感謝回報！');
    }
  };

  const getActionConfig = (actionName: string) => {
    switch (actionName) {
      case '點讚': return { icon: ThumbsUp, color: 'text-apple-blue', label: '點讚' };
      case '收藏': return { icon: Bookmark, color: 'text-red-500', label: '收藏' };
      case '不感興趣': return { icon: EyeOff, color: 'text-black', label: '不感興趣' };
      case '檢舉': return { icon: ShieldAlert, color: 'text-red-600', label: '檢舉' };
      default: return { icon: ThumbsUp, color: 'text-apple-blue', label: '點讚' };
    }
  };

  const gestureSettings = profile?.gestureSettings || { barLeft: '不感興趣', barRight: '點讚' } as GestureSettings;

  const filteredPosts = posts.filter(post => {
    if (profile?.hiddenItems?.includes(post.id)) return false;

    const s = search.toLowerCase();
    const author = authors[post.authorId];
    const matchesContent = post.content.toLowerCase().includes(s);
    const matchesAuthor = (author?.displayName?.toLowerCase() || '').includes(s) || 
                          (author?.username?.toLowerCase() || '').includes(s);
    
    if (!matchesContent && !matchesAuthor) return false;

    if (activeTab === 'friends') {
      const isFriend = profile?.friends?.includes(post.authorId);
      return isFriend;
    } else {
      return true;
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-apple-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-apple-gray-50/80 backdrop-blur-xl z-20 px-5 pt-12 pb-2 border-b border-apple-gray-100/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-apple-gray-900">旅吧</h1>
          <button 
            onClick={() => setIsPosting(true)}
            className="w-10 h-10 rounded-full bg-white border border-apple-gray-100 flex items-center justify-center text-apple-gray-600 active:scale-95 transition-transform shadow-apple-sm"
          >
            <Plus size={20} className="text-apple-blue" strokeWidth={3} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('recommended')}
            className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'recommended' ? 'text-apple-gray-900' : 'text-apple-gray-300'}`}
          >
            推薦
            {activeTab === 'recommended' && <motion.div layoutId="activeBarTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-apple-blue rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'friends' ? 'text-apple-gray-900' : 'text-apple-gray-300'}`}
          >
            好友
            {activeTab === 'friends' && <motion.div layoutId="activeBarTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-apple-blue rounded-full" />}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-300 opacity-60" size={16} strokeWidth={2.5} />
          <input
            type="text"
            placeholder="搜尋旅吧見聞"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-white border border-apple-gray-100 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-apple-gray-200 transition-all placeholder:text-apple-gray-300"
          />
        </div>
      </div>

      {/* Posts */}
      <div className="pb-32 px-5 space-y-4">
        {user && (profile?.hiddenItems?.length ?? 0) > 0 && (
          <div className="flex items-center justify-center py-2 bg-apple-gray-100/50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[10px] font-bold text-apple-gray-400">已隱藏 {profile?.hiddenItems?.length} 則旅文</span>
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

        <AnimatePresence mode="popLayout">
          {filteredPosts.map(post => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SwipeableWrapper
                leftAction={{ 
                  ...getActionConfig(gestureSettings.barLeft), 
                  onTrigger: () => handleAction(post, gestureSettings.barLeft) 
                }}
                rightAction={{ 
                  ...getActionConfig(gestureSettings.barRight), 
                  onTrigger: () => handleAction(post, gestureSettings.barRight) 
                }}
              >
                <BarPostCard post={post} author={authors[post.authorId]} onChatClick={onChatClick} />
              </SwipeableWrapper>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isPosting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white pt-12 px-6"
          >
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setIsPosting(false)} className="text-apple-gray-400 font-light">取消</button>
              <h2 className="font-semibold">發佈見聞</h2>
              <button 
                onClick={handleCreatePost}
                disabled={!newPostContent.trim()}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${newPostContent.trim() ? 'bg-apple-gray-600 text-white' : 'bg-apple-gray-50 text-apple-gray-300'}`}
              >
                發佈
              </button>
            </div>
            <textarea
              autoFocus
              placeholder="分享你在旅行中遇到的趣事、美食或提醒大家避雷的事..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full h-48 bg-transparent text-lg font-light focus:outline-none resize-none leading-relaxed"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
