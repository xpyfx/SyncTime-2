import React, { useEffect, useState } from 'react';
import { Search, Plus, Send, ThumbsUp, Bookmark, EyeOff, ShieldAlert } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { BarPost, UserProfile, GestureSettings } from '../types';
import { BarPostCard } from '../components/BarPostCard';
import { GlassSearchInput } from '../components/GlassSearchInput';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { SwipeableWrapper } from '../components/SwipeableWrapper';
import { ReportModal } from '../components/ReportModal';

export const TravelBarView: React.FC<{ 
  onChatClick: (roomId: string) => void,
  onAvatarClick?: (uid: string) => void
}> = ({ onChatClick, onAvatarClick }) => {
  const [posts, setPosts] = useState<BarPost[]>([]);
  const [activeTab, setActiveTab] = useState<'recommended' | 'friends'>('recommended');
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const [search, setSearch] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [reportingPost, setReportingPost] = useState<BarPost | null>(null);
  const { user, profile, isUserBlocked } = useAuth();

  useEffect(() => {
    if (!user) {
      setSavedPostIds(new Set());
      return;
    }
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'savedPosts'), (snap) => {
      setSavedPostIds(new Set(snap.docs.map(d => d.id)));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'barPosts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BarPost));
      setPosts(data);

      // Fetch authors
      const authorIds = Array.from(new Set(data.map(p => p.authorId)));
      if (authorIds.length > 0) {
        try {
          const results = await Promise.all(authorIds.map(async (id) => {
            const uDoc = await getDoc(doc(db, 'users', id));
            if (uDoc.exists()) {
              return { id, profile: uDoc.data() as UserProfile };
            }
            return null;
          }));
          const fetched: Record<string, UserProfile> = {};
          results.forEach(r => {
            if (r) fetched[r.id] = r.profile;
          });
          if (Object.keys(fetched).length > 0) {
            setAuthors(prev => ({ ...prev, ...fetched }));
          }
        } catch (error) {
          console.error('Error fetching authors: ', error);
        }
      }
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
      const postRef = doc(db, 'barPosts', post.id);
      const snap = await getDoc(likeDoc);
      const isLiked = snap.exists();
      if (!isLiked) {
        await setDoc(likeDoc, { createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
        if (post.authorId && post.authorId !== user.uid) {
          try {
            await addDoc(collection(db, 'notifications'), {
              type: 'post_like',
              fromId: user.uid,
              toId: post.authorId,
              postId: post.id,
              postSnippet: (post.content || '').slice(0, 60),
              postImage: post.imageUrl || post.images?.[0] || '',
              status: 'pending',
              createdAt: serverTimestamp()
            });
          } catch (notifErr) {
            console.warn('Failed to send like notification:', notifErr);
          }
        }
      } else {
        await deleteDoc(likeDoc);
        await updateDoc(postRef, { likesCount: increment(-1) });
      }
    } else if (action === '收藏') {
      const favRef = doc(db, 'users', user.uid, 'savedPosts', post.id);
      const postRef = doc(db, 'barPosts', post.id);
      const isFav = (await getDoc(favRef)).exists();
      if (!isFav) {
        await setDoc(favRef, { savedAt: serverTimestamp(), postId: post.id });
        await updateDoc(postRef, { favoritesCount: increment(1) });
      } else {
        await deleteDoc(favRef);
        await updateDoc(postRef, { favoritesCount: increment(-1) });
      }
    } else if (action === '不感興趣') {
      const isHidden = profile?.hiddenItems?.includes(post.id);
      if (isHidden) {
        await updateDoc(doc(db, 'users', user.uid), {
          hiddenItems: arrayRemove(post.id)
        });
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          hiddenItems: arrayUnion(post.id)
        });
      }
    } else if (action === '檢舉') {
      setReportingPost(post);
    }
  };

  const getActionConfig = (actionName: string, post?: BarPost) => {
    switch (actionName) {
      case '點讚': return { icon: ThumbsUp, color: 'text-apple-blue', label: '點讚' };
      case '收藏': {
        const isSaved = post ? savedPostIds.has(post.id) : false;
        return { 
          icon: Bookmark, 
          color: isSaved ? 'text-apple-gray-400' : 'text-red-500', 
          label: isSaved ? '取消收藏' : '收藏' 
        };
      }
      case '不感興趣': return { icon: EyeOff, color: 'text-black', label: '不感興趣' };
      case '檢舉': return { icon: ShieldAlert, color: 'text-red-600', label: '檢舉' };
      default: return { icon: ThumbsUp, color: 'text-apple-blue', label: '點讚' };
    }
  };

  const gestureSettings = profile?.gestureSettings || { barLeft: '不感興趣', barRight: '點讚' } as GestureSettings;

  const filteredPosts = posts.filter(post => {
    if (profile?.hiddenItems?.includes(post.id)) return false;
    if (isUserBlocked(post.authorId)) return false;

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
      <div className="sticky top-0 bg-apple-gray-50/80 backdrop-blur-xl z-20 px-5 pt-[max(env(safe-area-inset-top,0px),48px)] pb-2 border-b border-apple-gray-100/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-apple-gray-900">旅吧</h1>
          <button 
            onClick={() => setIsPosting(true)}
            className="w-11 h-11 rounded-full bg-white border border-apple-gray-100 flex items-center justify-center text-apple-gray-600 active:scale-90 transition-transform shadow-apple-sm cursor-pointer"
            aria-label="新增貼文"
          >
            <Plus size={22} className="text-apple-blue" strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 bg-apple-gray-100/50 p-1 rounded-2xl w-fit mb-2">
          <button 
            onClick={() => setActiveTab('recommended')}
            className={`px-4 py-1.5 text-xs font-bold transition-all rounded-xl relative ${activeTab === 'recommended' ? 'bg-[#E6F5FF] text-[#2A2B2A] shadow-apple-sm' : 'text-apple-gray-300'}`}
          >
            推薦
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-1.5 text-xs font-bold transition-all rounded-xl relative ${activeTab === 'friends' ? 'bg-[#E6F5FF] text-[#2A2B2A] shadow-apple-sm' : 'text-apple-gray-300'}`}
          >
            好友
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-5">
        <GlassSearchInput
          placeholder="搜尋旅吧見聞"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
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
                  ...getActionConfig(gestureSettings.barLeft, post), 
                  onTrigger: () => handleAction(post, gestureSettings.barLeft) 
                }}
                rightAction={{ 
                  ...getActionConfig(gestureSettings.barRight, post), 
                  onTrigger: () => handleAction(post, gestureSettings.barRight) 
                }}
              >
                <BarPostCard post={post} author={authors[post.authorId]} onChatClick={onChatClick} onAvatarClick={onAvatarClick} />
              </SwipeableWrapper>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isPosting && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[120] bg-white pt-[max(env(safe-area-inset-top,0px),1rem)] px-5 sm:px-6 flex flex-col h-[100dvh]"
          >
            <div className="flex items-center justify-between py-3 mb-4 border-b border-apple-gray-100/60">
              <button onClick={() => setIsPosting(false)} className="text-apple-gray-400 font-bold text-sm px-2 py-1 active:scale-95 transition-transform">取消</button>
              <h2 className="font-bold text-base text-[#2B2B2B]">發佈見聞</h2>
              <button 
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${newPostContent.trim() && !isSubmitting ? 'bg-[#035096] text-white active:scale-95' : 'bg-apple-gray-100 text-apple-gray-300'}`}
              >
                {isSubmitting ? '發佈中...' : '發佈'}
              </button>
            </div>
            <textarea
              autoFocus
              placeholder="分享你在旅行中遇到的趣事、美食或提醒大家避雷的事..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="flex-1 w-full bg-transparent text-base font-normal focus:outline-none resize-none leading-relaxed text-[#2B2B2B] placeholder:text-apple-gray-300 pb-[max(env(safe-area-inset-bottom,0px)+2rem,3rem)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      {reportingPost && (
        <ReportModal
          isOpen={!!reportingPost}
          onClose={() => setReportingPost(null)}
          targetType="bar_post"
          targetId={reportingPost.id}
          targetTitle={`見聞貼文: ${reportingPost.content.slice(0, 30)}${reportingPost.content.length > 30 ? '...' : ''} (由 ${authors[reportingPost.authorId]?.displayName || '旅客'} 發布)`}
        />
      )}
    </div>
  );
};
