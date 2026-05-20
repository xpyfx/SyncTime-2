import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  arrayUnion,
  getDocs
} from 'firebase/firestore';
import { Notification, UserProfile, Trip } from '../types';

export const NotificationsPage: React.FC<{ 
  onTripClick: (id: string) => void,
  onUserClick: (id: string) => void
}> = ({ onTripClick, onUserClick }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<(Notification & { fromProfile?: UserProfile, trip?: Trip })[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return '剛剛';
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return '剛剛';
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  useEffect(() => {
    if (!user) return;
    
    const profileCache: Record<string, UserProfile> = {};
    const tripCache: Record<string, Trip> = {};

    const qNotif = query(collection(db, 'notifications'), where('toId', '==', user.uid));
    
    const unsubNotif = onSnapshot(qNotif, async (s) => {
      try {
        const resolvedNotifs = await Promise.all(s.docs.map(async (d) => {
          const data = d.data();
          
          let fromProfile = profileCache[data.fromId];
          if (!fromProfile) {
            const fromSnap = await getDoc(doc(db, 'users', data.fromId));
            if (fromSnap.exists()) {
              fromProfile = fromSnap.data() as UserProfile;
              profileCache[data.fromId] = fromProfile;
            }
          }

          let tripData = data.tripId ? tripCache[data.tripId] : null;
          if (data.tripId && !tripData) {
            const tripSnap = await getDoc(doc(db, 'trips', data.tripId));
            if (tripSnap.exists()) {
              tripData = { id: tripSnap.id, ...tripSnap.data() } as Trip;
              tripCache[data.tripId] = tripData;
            }
          }

          return { 
            id: d.id, 
            ...data, 
            fromProfile: fromProfile || { displayName: '未知用戶' } as UserProfile,
            trip: tripData
          } as any;
        }));

        resolvedNotifs.sort((a, b) => {
          const getTime = (val: any) => {
            if (!val) return Date.now();
            if (val.toDate) return val.toDate().getTime();
            return new Date(val).getTime() || Date.now();
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });
        setNotifications(resolvedNotifs);
        setLoading(false);

        // Mark non-request notifications as read
        resolvedNotifs.forEach(async (n) => {
          if (n.status === 'pending' && n.type !== 'trip_join_request') {
            await updateDoc(doc(db, 'notifications', n.id), { status: 'read' });
          }
        });
      } catch (err) {
        console.error(err);
      }
    });

    return () => unsubNotif();
  }, [user]);

  const handleActionTripJoin = async (notif: any, approved: boolean) => {
    if (!user) return;
    try {
      if (approved && notif.tripId) {
        const tripRef = doc(db, 'trips', notif.tripId);
        await updateDoc(tripRef, { members: arrayUnion(notif.fromId) });
        
        const tripSnap = await getDoc(tripRef);
        if (tripSnap.exists()) {
          const trip = tripSnap.data() as Trip;
          if (trip.chatRoomId) {
            await updateDoc(doc(db, 'chatRooms', trip.chatRoomId), {
              participants: arrayUnion(notif.fromId),
              updatedAt: serverTimestamp()
            });
          }
          const currentCount = (trip.members?.length || 0) + 1;
          if (currentCount >= (trip.totalPeople || 0)) {
            await updateDoc(tripRef, { status: '已滿員' });
          }
        }
      }
      await updateDoc(doc(db, 'notifications', notif.id), { status: approved ? 'approved' : 'rejected' });
      await addDoc(collection(db, 'notifications'), {
        type: approved ? 'trip_join_approved' : 'trip_join_rejected',
        fromId: user.uid,
        toId: notif.fromId,
        tripId: notif.tripId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-apple-gray-50 pt-16 pb-32">
      <div className="px-6 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">通知</h1>
      </div>
      
      <div className="flex-1 px-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => n.tripId && onTripClick(n.tripId)}
              className={`flex items-start gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${n.status === 'pending' ? 'bg-apple-blue/5 border border-apple-blue/10 shadow-apple-sm' : 'bg-white border border-apple-gray-100 shadow-apple-xs'}`}
            >
              <div 
                className="w-10 h-10 rounded-full bg-apple-gray-100 overflow-hidden shadow-sm flex-shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (n.fromId) onUserClick(n.fromId);
                }}
              >
                {n.fromProfile?.avatarUrl && <img src={n.fromProfile.avatarUrl} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">
                  <span 
                    className="font-bold cursor-pointer hover:text-apple-blue transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (n.fromId) onUserClick(n.fromId);
                    }}
                  >
                    {n.fromProfile?.displayName}
                  </span>
                  {n.type === 'trip_join_request' && (
                    n.status === 'approved' ? ` 的加入申請（${n.trip?.country || '旅程'}）已同意` : 
                    n.status === 'rejected' ? ` 的加入申請（${n.trip?.country || '旅程'}）已拒絕` :
                    ` 申請加入你的 ${n.trip?.country || '旅程'}！`
                  )}
                  {n.type === 'trip_join_approved' && ` 已同意你加入 ${n.trip?.country || '旅程'}！`}
                  {n.type === 'trip_join_rejected' && ` 拒絕了你的 ${n.trip?.country || '旅程'} 申請。`}
                  {n.type === 'trip_member_removed' && ` 將你從 ${n.trip?.country || '旅程'} 中移除了。`}
                  {n.type === 'trip_member_exited' && ` 退出了你的 ${n.trip?.country || '旅程'}。`}
                </p>
                <p className="text-[10px] text-apple-gray-300 mt-1">
                  {formatDateTime(n.createdAt)}
                </p>
                
                {n.type === 'trip_join_request' && n.status === 'pending' && (
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleActionTripJoin(n, true)}
                      className="bg-apple-blue text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-apple-sm active:scale-95 transition-transform"
                    >
                      同意
                    </button>
                    <button 
                      onClick={() => handleActionTripJoin(n, false)}
                      className="bg-white text-apple-gray-400 px-4 py-1.5 rounded-lg text-xs font-bold border border-apple-gray-100 active:scale-95 transition-transform"
                    >
                      拒絕
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-apple-gray-300 italic">尚無通知</div>
        )}
      </div>
    </div>
  );
};
