import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut, deleteUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthModalState {
  isOpen: boolean;
  title: string;
  message: string;
  actionType?: 'switch-google' | 'dismiss';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authModal: AuthModalState | null;
  closeAuthModal: () => void;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  blockedByUsers: string[];
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  isUserBlocked: (targetUid: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState<AuthModalState | null>(null);

  const closeAuthModal = () => setAuthModal(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeBlockedBy: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Real-time listener for profile
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (!data.email && user.email) {
              updateDoc(doc(db, 'users', user.uid), { email: user.email }).catch(() => {});
            }
            setProfile({ ...data, email: data.email || user.email || '' });
            setLoading(false);
          } else {
            // Initialize profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || '新用戶',
              username: user.email?.split('@')[0] || user.uid.slice(0, 8),
              avatarUrl: user.photoURL || '',
              email: user.email || '',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', user.uid), {
              ...newProfile,
              email: user.email || '',
              createdAt: serverTimestamp(),
            });
            // onSnapshot will trigger again after setDoc
          }
        });

        // Real-time listener for users who blocked this user (mutual invisibility)
        try {
          const qBlockedBy = query(
            collection(db, 'users'),
            where('blockedUsers', 'array-contains', user.uid)
          );
          unsubscribeBlockedBy = onSnapshot(qBlockedBy, (snapshot) => {
            setBlockedByUsers(snapshot.docs.map(d => d.id));
          }, (err) => {
            console.warn('BlockedBy listener warning:', err);
          });
        } catch (bErr) {
          console.warn('Could not setup blockedBy listener:', bErr);
        }
      } else {
        setProfile(null);
        setBlockedByUsers([]);
        if (unsubscribeProfile) unsubscribeProfile();
        if (unsubscribeBlockedBy) unsubscribeBlockedBy();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeBlockedBy) unsubscribeBlockedBy();
    };
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User closed or cancelled popup, no alert needed
        return;
      }
      if (error.code === 'auth/popup-blocked') {
        setAuthModal({
          isOpen: true,
          title: '瀏覽器封鎖快顯視窗',
          message: '登入視窗被瀏覽器封鎖，請允許快顯視窗或點擊網址列旁的鎖定圖示以完成登入。',
          actionType: 'dismiss',
        });
      } else {
        console.warn('Google login warning:', error);
        setAuthModal({
          isOpen: true,
          title: '登入提醒',
          message: `登入時發生問題（${error.message || '請稍後再試'}）。`,
          actionType: 'dismiss',
        });
      }
    }
  };

  const loginWithApple = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User closed popup
        return;
      }
      if (error.code === 'auth/operation-not-allowed') {
        console.warn('Apple Login provider is not enabled in Firebase project:', error.message);
        setAuthModal({
          isOpen: true,
          title: 'Apple 帳號登入說明',
          message: '目前 Firebase 專案後台尚未啟用 Apple 登入提供者（需設定 Apple Developer 密鑰與 Services ID）。\n\n建議您直接使用「Google 登入」快速進入 SyncTime 探索旅程！',
          actionType: 'switch-google',
        });
      } else if (error.code === 'auth/popup-blocked') {
        setAuthModal({
          isOpen: true,
          title: '瀏覽器封鎖快顯視窗',
          message: '登入視窗被瀏覽器封鎖，請允許快顯視窗或點擊網址列旁的鎖定圖示以完成登入。',
          actionType: 'dismiss',
        });
      } else {
        console.warn('Apple login warning:', error);
        setAuthModal({
          isOpen: true,
          title: 'Apple 登入提醒',
          message: `Apple 登入尚未就緒：${error.message || '請稍後再試'}。建議改用 Google 登入。`,
          actionType: 'switch-google',
        });
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const uid = currentUser.uid;

    try {
      // 1. Mark user document as deleted and clear all personal passport information in Firestore
      try {
        await updateDoc(doc(db, 'users', uid), {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          displayName: '-',
          username: '-',
          avatarUrl: '',
          nationality: '-',
          birthday: '',
          gender: 'O',
          residence: '-',
          visitedCities: 0,
          bio: '',
          friends: [],
          blockedUsers: [],
          hiddenItems: [],
          isTrajectoryPublic: false
        });
      } catch (firestoreErr) {
        console.warn('Firestore user doc update warning:', firestoreErr);
      }

      // 2. Clear all user authored recruitment trips
      try {
        const tripsQ = query(collection(db, 'trips'), where('authorId', '==', uid));
        const tripsSnap = await getDocs(tripsQ);
        for (const tripDoc of tripsSnap.docs) {
          await deleteDoc(tripDoc.ref).catch(() => {});
        }
      } catch (tripsErr) {
        console.warn('Trips cleanup warning:', tripsErr);
      }

      // 3. Clear all user authored bar posts
      try {
        const postsQ = query(collection(db, 'barPosts'), where('authorId', '==', uid));
        const postsSnap = await getDocs(postsQ);
        for (const postDoc of postsSnap.docs) {
          await deleteDoc(postDoc.ref).catch(() => {});
        }
      } catch (postsErr) {
        console.warn('Posts cleanup warning:', postsErr);
      }

      // 4. Clear all user stays/footprints
      try {
        const staysQ = query(collection(db, 'stays'), where('userId', '==', uid));
        const staysSnap = await getDocs(staysQ);
        for (const stayDoc of staysSnap.docs) {
          await deleteDoc(stayDoc.ref).catch(() => {});
        }
      } catch (staysErr) {
        console.warn('Stays cleanup warning:', staysErr);
      }

      // 5. Delete user account from Firebase Auth
      await deleteUser(currentUser);

      // 6. Reset state
      setUser(null);
      setProfile(null);
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('REQUIRES_RECENT_LOGIN');
      }
      throw error;
    }
  };

  const blockUser = async (targetUid: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        blockedUsers: arrayUnion(targetUid),
        friends: arrayRemove(targetUid)
      });
      // Try to remove from target's friends list as well
      try {
        await updateDoc(doc(db, 'users', targetUid), {
          friends: arrayRemove(user.uid)
        });
      } catch {
        // May fail if security rules forbid modifying other users, harmless
      }
      setProfile(prev => prev ? {
        ...prev,
        blockedUsers: [...(prev.blockedUsers || []).filter(id => id !== targetUid), targetUid],
        friends: (prev.friends || []).filter(id => id !== targetUid)
      } : null);
    } catch (e) {
      console.error('Failed to block user:', e);
      throw e;
    }
  };

  const unblockUser = async (targetUid: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        blockedUsers: arrayRemove(targetUid)
      });
      setProfile(prev => prev ? {
        ...prev,
        blockedUsers: (prev.blockedUsers || []).filter(id => id !== targetUid)
      } : null);
    } catch (e) {
      console.error('Failed to unblock user:', e);
      throw e;
    }
  };

  const isUserBlocked = (targetUid: string) => {
    if (!targetUid || !user) return false;
    if (targetUid === user.uid) return false;
    const isBlockedByMe = (profile?.blockedUsers || []).includes(targetUid);
    const isBlockedByThem = (blockedByUsers || []).includes(targetUid);
    return isBlockedByMe || isBlockedByThem;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authModal,
        closeAuthModal,
        login,
        loginWithGoogle: login,
        loginWithApple,
        logout,
        deleteAccount,
        blockedByUsers,
        blockUser,
        unblockUser,
        isUserBlocked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
