import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, 
  Bell, 
  Shield, 
  LogOut, 
  ChevronRight, 
  UserPlus, 
  Search, 
  User, 
  Trash2,
  Bookmark,
  MessageCircle,
  Camera,
  Edit2,
  Info,
  X,
  Globe,
  MapPin,
  ArrowLeft,
  EyeOff
} from 'lucide-react';
import { getOrCreateChatRoom } from '../lib/chatUtils';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDoc,
  getDocs, 
  addDoc,
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  onSnapshot,
  serverTimestamp,
  orderBy,
  deleteDoc,
  documentId
} from 'firebase/firestore';
import { UserProfile, Notification, Trip, BarPost, GestureSettings } from '../types';
import { TripCard } from '../components/TripCard';
import { BarPostCard } from '../components/BarPostCard';
import { COUNTRIES, ENGLISH_COUNTRIES, getCountryISO3 } from '../lib/locationData';

const getZodiacSign = (dateVal: any) => {
  if (!dateVal) return 'Unknown';
  let date: Date;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    date = dateVal.toDate();
  } else {
    date = new Date(dateVal);
  }
  if (isNaN(date.getTime())) return 'Unknown';
  
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const signs = [
    { name: "Capricorn", start: [1, 1], end: [1, 19] },
    { name: "Aquarius", start: [1, 20], end: [2, 18] },
    { name: "Pisces", start: [2, 19], end: [3, 20] },
    { name: "Aries", start: [3, 21], end: [4, 19] },
    { name: "Taurus", start: [4, 20], end: [5, 20] },
    { name: "Gemini", start: [5, 21], end: [6, 21] },
    { name: "Cancer", start: [6, 22], end: [7, 22] },
    { name: "Leo", start: [7, 23], end: [8, 22] },
    { name: "Virgo", start: [8, 23], end: [9, 22] },
    { name: "Libra", start: [9, 23], end: [10, 23] },
    { name: "Scorpio", start: [10, 24], end: [11, 22] },
    { name: "Sagittarius", start: [11, 23], end: [12, 21] },
    { name: "Capricorn", start: [12, 22], end: [12, 31] }
  ];
  const sign = signs.find(s => {
    const sMonth = s.start[0];
    const sDay = s.start[1];
    const eMonth = s.end[0];
    const eDay = s.end[1];
    if (month === sMonth && day >= sDay) return true;
    if (month === eMonth && day <= eDay) return true;
    return false;
  });
  return sign ? sign.name : "Capricorn";
};

const calculateAge = (birthday: any) => {
  if (!birthday) return 0;
  let birth: Date;
  if (birthday.toDate && typeof birthday.toDate === 'function') {
    birth = birthday.toDate();
  } else {
    birth = new Date(birthday);
  }
  if (isNaN(birth.getTime())) return 0;
  
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

const formatDatePassport = (dateVal: any) => {
  if (!dateVal) return '---';
  let date: Date;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    date = dateVal.toDate();
  } else {
    date = new Date(dateVal);
  }
  if (isNaN(date.getTime())) return '---';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const generateMRZ = (profile: UserProfile) => {
  const age = calculateAge(profile.birthday || '');
  const code = getCountryISO3(profile.nationality || '');
  const name = (profile.displayName || '').toUpperCase().replace(/\s/g, '<');
  
  let row1 = `${age}<${code}<<${name}`;
  while (row1.length < 45) row1 += '<';
  row1 = row1.substring(0, 45);

  const id = (profile.username || '').toUpperCase();
  const nationality = getCountryISO3(profile.nationality || '');
  
  // Format dates for MRZ (YYYYMMDD)
  const getMRZDate = (dateVal: any) => {
    if (!dateVal) return '00000000';
    let date: Date;
    if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      date = dateVal.toDate();
    } else {
      date = new Date(dateVal);
    }
    if (isNaN(date.getTime())) return '00000000';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const dob = getMRZDate(profile.birthday);
  const gender = profile.gender || 'O';
  const issueDate = getMRZDate(profile.createdAt);
  const zodiac = getZodiacSign(profile.birthday || '').toUpperCase();
  
  let row2 = `${id}${nationality}${dob}${gender}${issueDate}${zodiac}`;
  while (row2.length < 45) row2 += '<';
  row2 = row2.substring(0, 45);

  return [row1, row2];
};

const ProfileItem = ({ icon: Icon, label, onClick, color = "text-apple-gray-600" }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-white active:bg-apple-gray-50 transition-colors border-b border-apple-gray-50 last:border-0"
  >
    <div className="flex items-center gap-4">
      <div className={`w-8 h-8 rounded-lg bg-apple-gray-50 flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
    <ChevronRight size={16} className="text-apple-gray-200" />
  </button>
);

export const ProfilePage: React.FC<{ 
  targetUserId?: string,
  onBack?: () => void,
  onMyPostsClick: () => void, 
  onTripClick: (id: string) => void,
  onChatClick: (roomId: string) => void 
}> = ({ targetUserId, onBack, onMyPostsClick, onTripClick, onChatClick }) => {
  const { user, profile: myProfile, logout } = useAuth();
  const effectiveUserId = targetUserId || user?.uid;
  const isOwnProfile = !targetUserId || targetUserId === user?.uid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!effectiveUserId) return;
    setProfileLoading(true);
    const unsub = onSnapshot(doc(db, 'users', effectiveUserId), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
      setProfileLoading(false);
    });
    return unsub;
  }, [effectiveUserId]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [firendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [showBlocklist, setShowBlocklist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGestureSettings, setShowGestureSettings] = useState(false);
  const [gestureSubMenu, setGestureSubMenu] = useState<keyof GestureSettings | null>(null);
  const [showEditPassport, setShowEditPassport] = useState(false);
  const [showFootprintInfo, setShowFootprintInfo] = useState(false);
  const [showFootprintDetail, setShowFootprintDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'trips' | 'saved' | 'friends' | 'posts'>('trips');
  const [postTab, setPostTab] = useState<'recruitment' | 'blog'>('recruitment');
  
  // Search states for each tab
  const [tripsSearch, setTripsSearch] = useState('');
  const [savedSearch, setSavedSearch] = useState('');
  const [friendsSearch, setFriendsSearch] = useState('');
  const [postsSearch, setPostsSearch] = useState('');

  const [goodbyeFriend, setGoodbyeFriend] = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts] = useState<BarPost[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [skipFriendWarningUntil, setSkipFriendWarningUntil] = useState<number>(0);
  const [dontWarnAgain, setDontWarnAgain] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    }
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  const [searchRequestPending, setSearchRequestPending] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<{ id: string, sender: UserProfile }[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showHiddenPosts, setShowHiddenPosts] = useState(false);
  const [hiddenTab, setHiddenTab] = useState<'trips' | 'posts'>('trips');
  const [hiddenTripsData, setHiddenTripsData] = useState<Trip[]>([]);
  const [hiddenBarPostsData, setHiddenBarPostsData] = useState<BarPost[]>([]);
  const [savedTab, setSavedTab] = useState<'trips' | 'posts'>('trips');
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [tripTab, setTripTab] = useState<'ongoing' | 'upcoming' | 'past'>('ongoing');
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [savedBarPosts, setSavedBarPosts] = useState<BarPost[]>([]);
  const [barAuthors, setBarAuthors] = useState<Record<string, UserProfile>>({});

  // Form state for editing passport
  const [passportForm, setPassportForm] = useState({
    displayName: '',
    avatarUrl: '',
    nationality: '',
    birthday: '',
    gender: 'O' as 'M' | 'F' | 'O',
    residence: '',
    visitedCities: 0
  });

  const [isPassportExpanded, setIsPassportExpanded] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic check: if it's way too big (e.g. 10MB), reject early to save memory
      if (file.size > 10 * 1024 * 1024) {
        alert('檔案太大（超過 10MB），請選擇較小的圖片');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Use Canvas to compress and resize
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          // Resize logic while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to compressed jpeg (much smaller than png)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
          setPassportForm(prev => ({
            ...prev,
            avatarUrl: dataUrl
          }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Passport Content Component (Internal to ProfileView)
  const renderPassportContent = (isExpanded = false) => (
    <div className={`${isExpanded ? 'p-10' : 'p-4'} flex-1 flex flex-col min-h-0 relative select-none`}>
      {/* Top Bar - Identity */}
      <div className={`flex justify-between items-center ${isExpanded ? 'mb-8' : 'mb-2.5'}`}>
        <div className="flex items-center gap-2">
          <span className={`${isExpanded ? 'text-[22px]' : 'text-[11px]'} font-black tracking-[0.25em] text-[#a08b5e] uppercase`}>Passport</span>
          <div className={`${isExpanded ? 'w-[2px] h-6' : 'w-[1px] h-3'} bg-[#dcd7c5]`} />
          <span className={`${isExpanded ? 'text-[14px]' : 'text-[8px]'} font-bold text-[#a08b5e] opacity-80 uppercase tracking-widest`}>Synctime Network</span>
        </div>
        {!isExpanded && (
          <div className="flex gap-1.5">
            <div className="w-5 h-4 rounded-sm border border-[#a08b5e]/30 bg-[#a08b5e]/5" />
            <div className="w-2 h-2 rounded-full bg-[#a08b5e] opacity-10" />
          </div>
        )}
        {isExpanded && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsPassportExpanded(false);
            }}
            className="text-[#a08b5e] cursor-pointer -rotate-90 p-2"
          >
            <X size={32} />
          </button>
        )}
      </div>

      <div className={`flex ${isExpanded ? 'gap-12' : 'gap-4'} flex-1 min-h-0`}>
        {/* Profile Photo - Left Side */}
        <div className={`${isExpanded ? 'w-[200px]' : 'w-[100px]'} shrink-0 flex flex-col justify-center`}>
          <div className={`aspect-[3/4] w-full bg-[#f0ede0] ${isExpanded ? 'rounded-2xl shadow-lg' : 'rounded-lg shadow-sm'} overflow-hidden border border-[#dcd7c5] relative`}>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover grayscale-[0.05] contrast-[1.05]" referrerPolicy="no-referrer" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${isExpanded ? 'text-8xl' : 'text-4xl'} text-[#d0ccb0] font-bold`}>
                {profile?.displayName?.[0]}
              </div>
            )}
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[repeating-linear-gradient(45deg,#000,#000_10px,#fff_10px,#fff_20px)]" />
          </div>
        </div>

        {/* Passport Information - Right Side */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          {/* Row 1: Age / Code / Passport ID */}
          <div className={`flex border-b border-[#eeebe0] ${isExpanded ? 'gap-6 pb-3 mb-3' : 'gap-4 pb-1.5 mb-1.5'}`}>
            <div className={isExpanded ? 'w-14' : 'w-8'}>
              <label className={`${isExpanded ? 'text-[9px]' : 'text-[6px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>年齡 Age</label>
              <p className={`${isExpanded ? 'text-xl' : 'text-[11px]'} font-black text-[#3d392f] leading-none mt-1`}>{calculateAge(profile?.birthday || '')}</p>
            </div>
            <div className={isExpanded ? 'w-16' : 'w-10'}>
              <label className={`${isExpanded ? 'text-[9px]' : 'text-[6px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>代碼 Code</label>
              <p className={`${isExpanded ? 'text-xl' : 'text-[11px]'} font-black text-[#3d392f] leading-none mt-1`}>{getCountryISO3(profile?.nationality || '')}</p>
            </div>
            <div className="min-w-0 flex-1">
              <label className={`${isExpanded ? 'text-[9px]' : 'text-[6px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>護照ID</label>
              <p className={`${isExpanded ? 'text-xl' : 'text-[11px]'} font-black text-[#3d392f] leading-none mt-1 truncate uppercase`}>{profile?.username}</p>
            </div>
          </div>

          {/* Row 2: Name */}
          <div className={isExpanded ? 'py-3' : 'py-1'}>
            <label className={`${isExpanded ? 'text-[9px]' : 'text-[6px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>姓名 Name</label>
            <p className={`${isExpanded ? 'text-3xl' : 'text-[19px]'} font-black text-[#2d2a23] leading-none truncate tracking-tight py-1`}>{profile?.displayName}</p>
          </div>

          {/* Bio Info Rows */}
          <div className={isExpanded ? 'space-y-4' : 'space-y-3'}>
            <div className="grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <label className={`${isExpanded ? 'text-[9px]' : 'text-[5.5px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>國籍 NAT.</label>
                <p className={`${isExpanded ? 'text-sm' : 'text-[9px]'} font-black text-[#5a5446] leading-none uppercase truncate mt-0.5`}>{profile?.nationality || 'Global'}</p>
              </div>
              <div className="min-w-0">
                <label className={`${isExpanded ? 'text-[9px]' : 'text-[5.5px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>性別 SEX</label>
                <p className={`${isExpanded ? 'text-sm' : 'text-[9px]'} font-black text-[#5a5446] leading-none uppercase mt-0.5`}>{profile?.gender || 'O'}</p>
              </div>
              <div className="min-w-0">
                <label className={`${isExpanded ? 'text-[9px]' : 'text-[5.5px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>出生 BIRTH</label>
                <p className={`${isExpanded ? 'text-sm' : 'text-[9px]'} font-black text-[#5a5446] leading-none uppercase mt-0.5`}>{formatDatePassport(profile?.birthday || '')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <label className={`${isExpanded ? 'text-[9px]' : 'text-[5.5px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>發照 ISSUE</label>
                <p className={`${isExpanded ? 'text-sm' : 'text-[9px]'} font-black text-[#5a5446] leading-none uppercase truncate mt-0.5`}>{formatDatePassport(profile?.createdAt || '')}</p>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-0.5">
                  <label className={`${isExpanded ? 'text-[9px]' : 'text-[5.5px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>已旅國 VISIT.</label>
                  {!isExpanded && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFootprintInfo(true);
                      }}
                      className="text-apple-gray-300 hover:text-apple-gray-500 transition-colors"
                    >
                      <Info size={5} />
                    </button>
                  )}
                </div>
                <p className={`${isExpanded ? 'text-sm' : 'text-[9px]'} font-black text-[#5a5446] leading-none uppercase mt-0.5`}>{profile?.visitedCities || 0}</p>
              </div>
              <div className="min-w-0">
                <label className={`${isExpanded ? 'text-[9px]' : 'text-[5.5px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block`}>居住地 RES.</label>
                <p className={`${isExpanded ? 'text-sm' : 'text-[9px]'} font-black text-[#5a5446] leading-none uppercase truncate mt-0.5`}>{profile?.residence || '---'}</p>
              </div>
            </div>
          </div>

          <div className={`mt-auto ${isExpanded ? 'pt-4 pb-1' : 'pt-2 pb-0.5'}`}>
            <label className={`${isExpanded ? 'text-[8px]' : 'text-[5px]'} font-bold text-apple-gray-400 uppercase tracking-tighter block mb-0.5`}>發照機構 AUTHORITY</label>
            <p className={`${isExpanded ? 'text-[9px]' : 'text-[7.5px]'} font-bold text-[#8e7d55] opacity-80 italic leading-none truncate`}>
              Synctime Professional Certification Organization
            </p>
          </div>
        </div>
      </div>

      {/* MRZ Area */}
      <div className={`${isExpanded ? 'mt-4 pt-3' : 'mt-1.5 pt-2'} border-t border-[#eeebe0] opacity-40`}>
        {profile && generateMRZ(profile).map((line, idx) => (
          <div key={idx} className={`grid grid-cols-[repeat(45,1fr)] w-full ${isExpanded ? 'mb-1' : 'mb-0.5'}`}>
            {line.split('').map((char, charIdx) => (
              <span key={charIdx} className={`font-mono ${isExpanded ? 'text-[11px]' : 'text-[8.5px]'} text-center leading-none text-[#3d392f] uppercase`}>
                {char}
              </span>
            ))}
          </div>
        ))}

      </div>
    </div>
  );

  useEffect(() => {
    if (profile) {
      setPassportForm({
        displayName: profile.displayName || '',
        avatarUrl: profile.avatarUrl || '',
        nationality: profile.nationality || '',
        birthday: profile.birthday || '',
        gender: (profile.gender as any) || 'O',
        residence: profile.residence || '',
        visitedCities: profile.visitedCities || 0
      });
    }
  }, [profile]);

  const handleUpdatePassport = async () => {
    if (!user) return;
    
    // Validation
    if (!passportForm.displayName.trim()) {
      alert('姓名 (NAME) 為必填欄位');
      return;
    }
    if (!passportForm.nationality.trim()) {
      alert('國籍 (NATIONALITY) 為必填欄位');
      return;
    }
    if (!ENGLISH_COUNTRIES.includes(passportForm.nationality)) {
      alert('請由清單中選擇正確的國籍 (請選擇英文名稱)');
      return;
    }
    if (!passportForm.birthday) {
      alert('出生日期 (DATE OF BIRTH) 為必填欄位');
      return;
    }
    if (!passportForm.gender) {
      alert('性別 (GENDER) 為必填欄位');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), passportForm);
      setShowEditPassport(false);
      alert('護照資料已更新');
    } catch (e) {
      console.error(e);
      alert('更新失敗');
    }
  };

  useEffect(() => {
    if (!user || !searchResult) {
      setSearchRequestPending(false);
      return;
    }
    const q = query(collection(db, 'friendRequests'), 
      where('senderId', '==', user.uid), 
      where('receiverId', '==', searchResult.uid),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (s) => setSearchRequestPending(!s.empty));
  }, [user, searchResult]);

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
    if (!effectiveUserId) return;
    
    // Cache for profiles and trips to avoid redundant fetches
    const profileCache: Record<string, UserProfile> = {};

    // Listen to friend requests (Only for own profile)
    let unsubReq = () => {};
    if (isOwnProfile) {
      const qReq = query(collection(db, 'friendRequests'), where('receiverId', '==', effectiveUserId), where('status', '==', 'pending'));
      unsubReq = onSnapshot(qReq, async (s) => {
        const reqs = [];
        for (const d of s.docs) {
          const data = d.data();
          if (!profileCache[data.senderId]) {
            const uS = await getDoc(doc(db, 'users', data.senderId));
            if (uS.exists()) profileCache[data.senderId] = uS.data() as UserProfile;
          }
          if (profileCache[data.senderId]) {
            reqs.push({ id: d.id, sender: profileCache[data.senderId] });
          }
        }
        setPendingRequests(reqs);
      });
    }

    // Listen to saved trips
    const unsubSaved = onSnapshot(collection(db, 'users', effectiveUserId, 'savedTrips'), async (s) => {
      const tripsPromises = s.docs.map(async (d) => {
        const tripSnap = await getDoc(doc(db, 'trips', d.id));
        if (tripSnap.exists()) {
          return { id: tripSnap.id, ...tripSnap.data() } as Trip;
        }
        return null;
      });
      const trips = (await Promise.all(tripsPromises)).filter((t): t is Trip => t !== null);
      setSavedTrips(trips);

      // Fetch authors for these trips
      const authorIds = Array.from(new Set(trips.map(t => t.authorId)));
      const newAuthors = { ...barAuthors };
      let changed = false;
      for (const id of authorIds) {
        if (!newAuthors[id]) {
          const uDoc = await getDoc(doc(db, 'users', id));
          if (uDoc.exists()) {
            newAuthors[id] = uDoc.data() as UserProfile;
            changed = true;
          }
        }
      }
      if (changed) setBarAuthors(newAuthors);
    });

    // Listen to saved bar posts
    const unsubSavedPosts = onSnapshot(collection(db, 'users', effectiveUserId, 'savedPosts'), async (s) => {
      const postsPromises = s.docs.map(async (d) => {
        const postSnap = await getDoc(doc(db, 'barPosts', d.id));
        if (postSnap.exists()) {
          return { id: postSnap.id, ...postSnap.data() } as BarPost;
        }
        return null;
      });
      const posts = (await Promise.all(postsPromises)).filter((p): p is BarPost => p !== null);
      setSavedBarPosts(posts);

      // Fetch authors for these posts
      const authorIds = Array.from(new Set(posts.map(p => p.authorId)));
      const newAuthors = { ...barAuthors };
      let changed = false;
      for (const id of authorIds) {
        if (!newAuthors[id]) {
          const uDoc = await getDoc(doc(db, 'users', id));
          if (uDoc.exists()) {
            newAuthors[id] = uDoc.data() as UserProfile;
            changed = true;
          }
        }
      }
      if (changed) setBarAuthors(newAuthors);
    });

    // Listen to my joined trips (inclusive of authoring)
    const qMyTripsArr = query(collection(db, 'trips'), where('members', 'array-contains', effectiveUserId));
    const unsubMyTrips = onSnapshot(qMyTripsArr, async (s) => {
      const trips = s.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
      setMyTrips(trips);

      // Fetch authors for these trips
      const authorIds = Array.from(new Set(trips.map(t => t.authorId)));
      const newAuthors = { ...barAuthors };
      let changed = false;
      for (const id of authorIds) {
        if (!newAuthors[id]) {
          const uDoc = await getDoc(doc(db, 'users', id));
          if (uDoc.exists()) {
            newAuthors[id] = uDoc.data() as UserProfile;
            changed = true;
          }
        }
      }
      if (changed) setBarAuthors(newAuthors);
    });

    // Listen to my authored trips
    const qTripsAuth = query(collection(db, 'trips'), where('authorId', '==', effectiveUserId));
    const unsubTrips = onSnapshot(qTripsAuth, (s) => {
      // Just for count consistency
    });

    // Listen to my bar posts
    const qBarPostsAuth = query(collection(db, 'barPosts'), where('authorId', '==', effectiveUserId));
    const unsubBar = onSnapshot(qBarPostsAuth, (barS) => {
      const posts = barS.docs.map(d => ({ id: d.id, ...d.data() } as BarPost));
      setMyPosts(posts);
    });

    return () => { 
      unsubReq(); 
      unsubTrips(); 
      unsubBar();
      unsubSaved(); 
      unsubSavedPosts(); 
      unsubMyTrips(); 
    };
  }, [effectiveUserId, isOwnProfile]);

  // Combined effect for posts count to avoid race conditions
  useEffect(() => {
    if (!effectiveUserId) return;
    const q1 = query(collection(db, 'trips'), where('authorId', '==', effectiveUserId));
    const q2 = query(collection(db, 'barPosts'), where('authorId', '==', effectiveUserId));
    
    let count1 = 0;
    let count2 = 0;

    const unsub1 = onSnapshot(q1, s => {
      count1 = s.size;
      setPostsCount(count1 + count2);
    });
    const unsub2 = onSnapshot(q2, s => {
      count2 = s.size;
      setPostsCount(count1 + count2);
    });

    return () => { unsub1(); unsub2(); };
  }, [effectiveUserId]);

  useEffect(() => {
    if (!profile?.friends?.length) {
      setFriendsList([]);
      return;
    }
    const q = query(collection(db, 'users'), where(documentId(), 'in', profile.friends));
    return onSnapshot(q, (s) => setFriendsList(s.docs.map(d => d.data() as UserProfile)));
  }, [profile?.friends]);

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

  const handleAddFriend = async (targetId: string) => {
    if (!user) return;
    try {
      const q = query(collection(db, 'friendRequests'), 
        where('senderId', '==', user.uid), 
        where('receiverId', '==', targetId),
        where('status', '==', 'pending')
      );
      const s = await getDocs(q);
      
      if (!s.empty) {
        // Withdraw request
        await deleteDoc(doc(db, 'friendRequests', s.docs[0].id));
        alert('已收回好友請求');
        return;
      }

      await addDoc(collection(db, 'friendRequests'), {
        senderId: user.uid,
        receiverId: targetId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('好友請求已發送');
      if (showSearch) {
        setShowSearch(false);
        setSearchId('');
        setSearchResult(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'friendRequests');
    }
  };

  const handleApproveRequest = async (requestId: string, senderId: string) => {
    if (!user) return;
    try {
      // Approve request
      await updateDoc(doc(db, 'friendRequests', requestId), { status: 'approved' });
      // Add both ways
      await updateDoc(doc(db, 'users', user.uid), { friends: arrayUnion(senderId) });
      await updateDoc(doc(db, 'users', senderId), { friends: arrayUnion(user.uid) });
      alert('已成爲好友');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), { status: 'rejected' });
    } catch (e) {
      console.error(e);
    }
  };

  const removeFriend = async (targetId: string, skipConfirm = false) => {
    if (!user) return;
    if (!skipConfirm && !window.confirm('確定要刪除好友嗎？')) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayRemove(targetId)
      });
      await updateDoc(doc(db, 'users', targetId), {
        friends: arrayRemove(user.uid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const openChatWithFriend = async (friendId: string) => {
    if (!user) return;
    const roomId = await getOrCreateChatRoom(user.uid, friendId);
    if (roomId) {
      setShowFriends(false);
      onChatClick(roomId);
    }
  };

  const [isFriend, setIsFriend] = useState(false);
  const [requestItemPending, setRequestItemPending] = useState(false);

  useEffect(() => {
    if (myProfile?.friends?.includes(effectiveUserId || '')) {
      setIsFriend(true);
    } else {
      setIsFriend(false);
    }
  }, [myProfile, effectiveUserId]);

  useEffect(() => {
    if (!user || isOwnProfile || !effectiveUserId) return;
    const q = query(collection(db, 'friendRequests'), 
      where('senderId', '==', user.uid), 
      where('receiverId', '==', effectiveUserId),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (s) => setRequestItemPending(!s.empty));
  }, [user, effectiveUserId, isOwnProfile]);

  const handleContact = async () => {
    if (!user || !effectiveUserId) return;
    const roomId = await getOrCreateChatRoom(user.uid, effectiveUserId);
    if (roomId) onChatClick(roomId);
  };

  const updateGestureSetting = async (key: keyof GestureSettings, value: string) => {
    if (!user || !profile) return;
    const newSettings = {
      ...(profile.gestureSettings || {
        homeLeft: '不感興趣',
        homeRight: '收藏',
        barLeft: '不感興趣',
        barRight: '點讚'
      }),
      [key]: value
    };
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        gestureSettings: newSettings
      });
    } catch (e) {
      console.error(e);
    }
  };

  const gestureOptions = {
    home: ['收藏', '不感興趣', '檢舉'],
    bar: ['點讚', '收藏', '不感興趣', '檢舉']
  };

  useEffect(() => {
    if (!showHiddenPosts || !user || !profile?.hiddenItems?.length) {
      if (!showHiddenPosts) {
        setHiddenTripsData([]);
        setHiddenBarPostsData([]);
      }
      return;
    }

    const fetchHidden = async () => {
      const hiddenIds = profile.hiddenItems;
      if (!hiddenIds || hiddenIds.length === 0) return;

      // Group IDs to minimize fetches if possible, but Firestore 'in' limit is 30
      // For simplicity, we fetch all and filter in memory or fetch individually
      // Given typical hidden items count, let's fetch in chunks
      
      const trips: Trip[] = [];
      const barPosts: BarPost[] = [];

      for (const id of hiddenIds) {
        // Try trips collection
        const tSnap = await getDoc(doc(db, 'trips', id));
        if (tSnap.exists()) {
          trips.push({ id: tSnap.id, ...tSnap.data() } as Trip);
          continue;
        }
        // Try barPosts collection
        const bSnap = await getDoc(doc(db, 'barPosts', id));
        if (bSnap.exists()) {
          barPosts.push({ id: bSnap.id, ...bSnap.data() } as BarPost);
        }
      }

      setHiddenTripsData(trips);
      setHiddenBarPostsData(barPosts);

      // Fetch authors for these items
      const authorIds = Array.from(new Set([...trips.map(t => t.authorId), ...barPosts.map(p => p.authorId)]));
      const newAuthors = { ...barAuthors };
      let changed = false;
      for (const id of authorIds) {
        if (!newAuthors[id]) {
          const uDoc = await getDoc(doc(db, 'users', id));
          if (uDoc.exists()) {
            newAuthors[id] = uDoc.data() as UserProfile;
            changed = true;
          }
        }
      }
      if (changed) setBarAuthors(newAuthors);
    };

    fetchHidden();
  }, [showHiddenPosts, profile?.hiddenItems, user]);

  const handleRestoreItem = async (itemId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hiddenItems: arrayRemove(itemId)
      });
      // Local update for snappier UI
      setHiddenTripsData(prev => prev.filter(t => t.id !== itemId));
      setHiddenBarPostsData(prev => prev.filter(p => p.id !== itemId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-apple-gray-50">
      {/* Top Action Icons - Sticky instead of Fixed to respect stacking context */}
      <div className="sticky top-0 left-0 right-0 z-10 px-6 pt-6 pb-4 flex items-center justify-between pointer-events-none bg-apple-gray-50/80 backdrop-blur-md">
        {onBack ? (
          <button 
            onClick={onBack}
            className="p-2 text-apple-gray-900 pointer-events-auto active:scale-90 transition-transform"
          >
            <ArrowLeft size={28} />
          </button>
        ) : (
          isOwnProfile && (
            <button 
              onClick={() => setShowRequests(true)}
              className="p-2 text-apple-gray-900 pointer-events-auto active:scale-90 transition-transform relative"
            >
              <UserPlus size={28} />
              {pendingRequests.length > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )
        )}
        
        {!onBack && isOwnProfile && (
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-apple-gray-900 pointer-events-auto active:scale-90 transition-transform"
          >
            <Settings size={28} />
          </button>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white pt-12 overflow-y-auto"
          >
            <div className="px-6 flex items-center justify-between mb-4 border-b border-apple-gray-50 pb-4 bg-white sticky top-0">
              <h2 className="text-lg font-bold">設定</h2>
              <button onClick={() => setShowSettings(false)} className="text-apple-gray-600 font-medium">完成</button>
            </div>
            
            <div className="px-4 space-y-4">
              <div className="bg-white rounded-2xl overflow-hidden shadow-apple-sm border border-apple-gray-100">
                <ProfileItem icon={Edit2} label="修改護照資料" onClick={() => {
                  setShowEditPassport(true);
                  setShowSettings(false);
                }} />
                
                {/* Basic Settings Section */}
                <div className="px-4 py-3 bg-apple-gray-50/50 border-b border-apple-gray-50">
                   <span className="text-[10px] font-black text-apple-gray-300 uppercase tracking-widest">基本設定</span>
                </div>
                
                <ProfileItem icon={Settings} label="手勢設定" onClick={() => setShowGestureSettings(true)} />
                <ProfileItem icon={EyeOff} label="隱藏的貼文" onClick={() => setShowHiddenPosts(true)} />

                <div className="w-full flex items-center justify-between p-4 bg-white active:bg-apple-gray-50 transition-colors border-b border-apple-gray-50 last:border-0 cursor-not-allowed opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-apple-gray-50 flex items-center justify-center text-apple-gray-600">
                      <Search size={18} />
                    </div>
                    <span className="text-sm font-medium">語言 (Language)</span>
                  </div>
                  <span className="text-xs text-apple-gray-300">繁體中文</span>
                </div>
                <ProfileItem icon={Bell} label="通知設定" />
                <ProfileItem icon={Shield} label="隱私與封鎖名單" onClick={() => {
                  setShowBlocklist(true);
                  setShowSettings(false);
                }} />
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-apple-sm border border-apple-gray-100">
                <ProfileItem 
                  icon={LogOut} 
                  label="登出帳號" 
                  color="text-red-400" 
                  onClick={() => {
                    logout();
                    setShowSettings(false);
                  }} 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Settings Modal */}
      <AnimatePresence>
        {showGestureSettings && (
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            className="fixed inset-0 z-[210] bg-white pt-12 overflow-y-auto"
          >
            <div className="px-6 flex items-center justify-between mb-4 border-b border-apple-gray-50 pb-4 bg-white sticky top-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowGestureSettings(false)} className="p-1 -ml-1 text-apple-gray-400">
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <h2 className="text-lg font-bold">手勢設定</h2>
              </div>
              <button onClick={() => setShowGestureSettings(false)} className="text-apple-blue font-bold">完成</button>
            </div>

            <div className="px-4 space-y-6">
              {/* Home Section */}
              <div className="space-y-3">
                <h3 className="px-2 text-xs font-black text-apple-gray-300 uppercase tracking-widest">主頁徵文</h3>
                <div className="bg-white rounded-2xl overflow-hidden border border-apple-gray-100 shadow-apple-xs">
                  <button 
                    onClick={() => setGestureSubMenu('homeLeft')}
                    className="w-full flex items-center justify-between p-4 bg-white active:bg-apple-gray-50 transition-colors border-b border-apple-gray-50"
                  >
                    <span className="text-sm font-bold">左滑手勢</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-apple-gray-300 font-medium">{profile?.gestureSettings?.homeLeft || '不感興趣'}</span>
                       <ChevronRight size={16} className="text-apple-gray-200" />
                    </div>
                  </button>
                  <button 
                    onClick={() => setGestureSubMenu('homeRight')}
                    className="w-full flex items-center justify-between p-4 bg-white active:bg-apple-gray-50 transition-colors"
                  >
                    <span className="text-sm font-bold">右滑手勢</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-apple-gray-300 font-medium">{profile?.gestureSettings?.homeRight || '收藏'}</span>
                       <ChevronRight size={16} className="text-apple-gray-200" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Bar Section */}
              <div className="space-y-3">
                <h3 className="px-2 text-xs font-black text-apple-gray-300 uppercase tracking-widest">旅吧旅文</h3>
                <div className="bg-white rounded-2xl overflow-hidden border border-apple-gray-100 shadow-apple-xs">
                  <button 
                    onClick={() => setGestureSubMenu('barLeft')}
                    className="w-full flex items-center justify-between p-4 bg-white active:bg-apple-gray-50 transition-colors border-b border-apple-gray-50"
                  >
                    <span className="text-sm font-bold">左滑手勢</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-apple-gray-300 font-medium">{profile?.gestureSettings?.barLeft || '不感興趣'}</span>
                       <ChevronRight size={16} className="text-apple-gray-200" />
                    </div>
                  </button>
                  <button 
                    onClick={() => setGestureSubMenu('barRight')}
                    className="w-full flex items-center justify-between p-4 bg-white active:bg-apple-gray-50 transition-colors"
                  >
                    <span className="text-sm font-bold">右滑手勢</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-apple-gray-300 font-medium">{profile?.gestureSettings?.barRight || '點讚'}</span>
                       <ChevronRight size={16} className="text-apple-gray-200" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-menu implementation */}
            <AnimatePresence>
              {gestureSubMenu && (
                <motion.div 
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                  className="fixed inset-0 z-[220] bg-white pt-12"
                >
                  <div className="px-6 flex items-center justify-between mb-4 border-b border-apple-gray-50 pb-4 bg-white">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setGestureSubMenu(null)} className="p-1 -ml-1 text-apple-gray-400">
                        <ChevronRight size={24} className="rotate-180" />
                      </button>
                      <h2 className="text-lg font-bold">
                        {gestureSubMenu === 'homeLeft' || gestureSubMenu === 'barLeft' ? '左滑手勢' : '右滑手勢'}
                      </h2>
                    </div>
                  </div>

                  <div className="px-4">
                    <div className="bg-white rounded-2xl overflow-hidden border border-apple-gray-100 shadow-apple-xs">
                      {(gestureSubMenu.startsWith('home') ? gestureOptions.home : gestureOptions.bar).map((opt) => (
                        <button 
                          key={opt}
                          onClick={() => {
                            updateGestureSetting(gestureSubMenu, opt);
                            setGestureSubMenu(null);
                          }}
                          className="w-full flex items-center justify-between p-4 bg-white active:bg-apple-gray-50 transition-colors border-b border-apple-gray-50 last:border-0"
                        >
                          <span className="text-sm font-bold">{opt}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            (profile?.gestureSettings?.[gestureSubMenu] || (
                              gestureSubMenu === 'homeRight' ? '收藏' : 
                              gestureSubMenu === 'barRight' ? '點讚' : 
                              '不感興趣'
                            )) === opt 
                            ? 'border-apple-blue bg-apple-blue' 
                            : 'border-apple-gray-100'
                          }`}>
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showEditPassport && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            <div className="px-6 pt-12 pb-4 flex items-center justify-between border-b border-apple-gray-50 bg-white shrink-0">
              <h2 className="text-lg font-bold">修改護照資料</h2>
              <button onClick={() => setShowEditPassport(false)} className="text-apple-gray-400">取消</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Avatar Editor */}
              <div className="flex flex-col items-center">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-24 h-24 rounded-full bg-apple-gray-50 overflow-hidden border-4 border-white shadow-apple-md">
                    {passportForm.avatarUrl ? (
                      <img src={passportForm.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-apple-gray-200">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white mb-1" />
                    <span className="text-[10px] text-white font-bold">更換頭像</span>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                <div className="mt-6 w-full">
                  <label className="text-xs font-bold text-apple-gray-300 mb-2 block uppercase px-1">頭像設定 (Avatar Settings)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="手動貼上圖片網址..."
                        value={passportForm.avatarUrl.startsWith('data:') ? '已選取本地檔案' : passportForm.avatarUrl}
                        onChange={e => {
                          if (!passportForm.avatarUrl.startsWith('data:')) {
                            setPassportForm(p => ({ ...p, avatarUrl: e.target.value }));
                          }
                        }}
                        className={`w-full bg-apple-gray-50 rounded-xl px-4 h-12 text-sm focus:outline-apple-blue font-medium ${passportForm.avatarUrl.startsWith('data:') ? 'text-apple-gray-300 italic' : ''}`}
                      />
                      {passportForm.avatarUrl.startsWith('data:') && (
                        <button 
                          onClick={() => setPassportForm(p => ({ ...p, avatarUrl: profile?.avatarUrl || '' }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-apple-blue font-bold text-[10px] hover:underline px-2 h-8"
                        >
                          重置
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 bg-apple-gray-900 text-white rounded-xl text-xs font-black h-12 flex items-center gap-2 active:scale-95 transition-transform shrink-0"
                    >
                      <Edit2 size={14} />
                      選取檔案
                    </button>
                  </div>
                  <p className="text-[10px] text-apple-gray-300 mt-2 px-1 leading-relaxed">
                    您可以直接點擊上方圓圈上傳本地照片，或是提供公開的圖片網址。
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-apple-gray-50">
                <div>
                  <label className="text-xs font-bold text-apple-gray-300 mb-2 block uppercase">姓名 (Name) <span className="text-red-400">*</span></label>
                  <input 
                    type="text" 
                    value={passportForm.displayName}
                    onChange={e => setPassportForm(p => ({ ...p, displayName: e.target.value }))}
                    className="w-full bg-apple-gray-50 rounded-xl px-4 h-12 text-sm focus:outline-apple-blue font-bold"
                  />
                </div>
                <div className="relative" ref={countryDropdownRef}>
                  <label className="text-xs font-bold text-apple-gray-300 mb-2 block uppercase">國籍 (Nationality) <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-300 pointer-events-none">
                      <Globe size={16} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="搜尋或選擇國籍..."
                      value={showCountryDropdown ? countrySearch : passportForm.nationality}
                      onFocus={() => {
                        setShowCountryDropdown(true);
                        setCountrySearch('');
                      }}
                      onChange={e => setCountrySearch(e.target.value)}
                      className="w-full bg-apple-gray-50 rounded-xl pl-11 pr-4 h-12 text-sm focus:outline-apple-blue font-bold text-apple-gray-900"
                    />
                    {showCountryDropdown && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-2xl shadow-apple-lg border border-apple-gray-100 max-h-[250px] overflow-y-auto z-[300] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {ENGLISH_COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).length > 0 ? (
                          ENGLISH_COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 50).map(country => (
                            <button
                              key={country}
                              onClick={() => {
                                setPassportForm(p => ({ ...p, nationality: country }));
                                setShowCountryDropdown(false);
                                setCountrySearch('');
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-apple-gray-50 active:bg-apple-gray-100 transition-colors border-b border-apple-gray-50 last:border-0"
                            >
                              <div className="font-bold text-apple-gray-700">{country}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-xs text-apple-gray-300 italic">找不到符合的英文國家名稱</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-apple-gray-300 mb-2 block uppercase">出生日期 (Date of Birth) <span className="text-red-400">*</span></label>
                  <input 
                    type="date" 
                    value={passportForm.birthday}
                    onChange={e => setPassportForm(p => ({ ...p, birthday: e.target.value }))}
                    className="w-full bg-apple-gray-50 rounded-xl px-4 h-12 text-sm focus:outline-apple-blue font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-apple-gray-300 mb-2 block uppercase">性別 (Gender) <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    {(['M', 'F', 'O'] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setPassportForm(p => ({ ...p, gender: g }))}
                        className={`flex-1 h-12 rounded-xl text-sm font-bold transition-all ${passportForm.gender === g ? 'bg-apple-gray-600 text-white' : 'bg-apple-gray-50 text-apple-gray-400'}`}
                      >
                        {g === 'M' ? '男' : g === 'F' ? '女' : '其他'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-apple-gray-300 mb-2 block uppercase">已旅國 (Visited Countries/Cities)</label>
                  <input 
                    type="number" 
                    value={passportForm.visitedCities}
                    onChange={e => setPassportForm(p => ({ ...p, visitedCities: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-apple-gray-50 rounded-xl px-4 h-12 text-sm focus:outline-apple-blue"
                  />
                </div>
              </div>

              <button 
                onClick={handleUpdatePassport}
                className="w-full bg-apple-blue text-white h-14 rounded-2xl font-bold shadow-apple-md active:scale-95 transition-transform"
              >
                儲存更新
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Requests Modal */}
      <AnimatePresence>
        {showRequests && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            <div className="px-6 pt-12 pb-4 flex items-center justify-between border-b border-apple-gray-50 bg-white shrink-0">
              <h2 className="text-lg font-bold">好友申請</h2>
              <button onClick={() => setShowRequests(false)} className="text-apple-gray-600 font-medium">關閉</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-apple-gray-50 rounded-2xl p-4 flex flex-col gap-3 border border-apple-gray-100">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="輸入用戶 ID"
                      value={searchId}
                      onChange={e => setSearchId(e.target.value)}
                      className="flex-1 bg-white border border-apple-gray-100 rounded-xl px-4 text-sm focus:outline-none h-11"
                    />
                    <button 
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="bg-apple-gray-600 text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                    >
                      {isSearching ? '搜尋器' : '搜尋'}
                    </button>
                  </div>

                  {searchResult && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-apple-gray-100 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-apple-gray-50 overflow-hidden border border-apple-gray-100">
                          {searchResult.avatarUrl ? <img src={searchResult.avatarUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-apple-gray-200" />}
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
                          onClick={() => handleAddFriend(searchResult.uid)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-apple-sm active:scale-95 transition-transform ${
                            searchRequestPending ? 'bg-apple-gray-100 text-apple-gray-400' : 'text-white bg-apple-blue'
                          }`}
                        >
                          {searchRequestPending ? '已發送' : '添加'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-apple-gray-50 pt-4">
                  <h3 className="text-xs font-bold text-apple-gray-300 uppercase mb-3">待處理申請</h3>
                  {pendingRequests.length ? pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-apple-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white overflow-hidden shadow-sm">
                      {req.sender.avatarUrl && <img src={req.sender.avatarUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{req.sender.displayName}</div>
                      <div className="text-[10px] text-apple-gray-300">@{req.sender.username}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApproveRequest(req.id, req.sender.uid)}
                      className="bg-apple-blue text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-apple-sm"
                    >
                      同意
                    </button>
                    <button 
                      onClick={() => handleRejectRequest(req.id)}
                      className="bg-white text-apple-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-apple-gray-100"
                    >
                      拒絕
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-apple-gray-300 italic">尚無申請內容</div>
              )}
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Friends List Modal */}
      <AnimatePresence>
        {showFriends && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white pt-12"
          >
            <div className="px-6 flex items-center justify-between mb-4 border-b border-apple-gray-50 pb-4 bg-white">
              <h2 className="text-lg font-bold">我的好友</h2>
              <button onClick={() => setShowFriends(false)} className="text-apple-gray-600 font-medium">完成</button>
            </div>
            <div className="p-4 space-y-4">
              {firendsList.length ? firendsList.map(f => (
                <div key={f.uid} className="flex items-center justify-between p-4 bg-apple-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-apple-gray-100 overflow-hidden">
                      {f.avatarUrl && <img src={f.avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{f.displayName}</div>
                      <div className="text-[10px] text-apple-gray-300">@{f.username}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openChatWithFriend(f.uid)} className="text-apple-blue p-2 active:scale-90 transition-transform"><MessageCircle size={18} /></button>
                    <button onClick={() => removeFriend(f.uid)} className="text-red-400 p-2 active:scale-90 transition-transform"><Trash2 size={16} /></button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-apple-gray-300 italic">尚無好友</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blocklist Modal */}
      <AnimatePresence>
        {showBlocklist && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white pt-12"
          >
            <div className="px-6 flex items-center justify-between mb-4 border-b border-apple-gray-50 pb-4 bg-white">
              <h2 className="text-lg font-bold">封鎖名單</h2>
              <button onClick={() => setShowBlocklist(false)} className="text-apple-gray-600 font-medium font-bold">完成</button>
            </div>
            <div className="p-6">
              {profile?.blockedUsers?.length ? (
                profile.blockedUsers.map(id => (
                  <div key={id} className="flex justify-between items-center py-3 border-b border-apple-gray-50">
                    <span className="text-sm">用戶 ID: {id}</span>
                    <button className="text-xs text-apple-blue font-medium">解除封鎖</button>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-apple-gray-300 italic">名單為空</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passport Header */}
      <div className="px-4 pt-4">
        <motion.div 
          onClick={() => setIsPassportExpanded(true)}
          layoutId={`passport-card-${effectiveUserId}`}
          className="w-full aspect-[1.36/1] bg-[#fdfcf7] rounded-[24px] shadow-2xl border border-[#e5e0d0] overflow-hidden relative flex flex-col cursor-pointer"
        >
          {/* Passport Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }} />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#f4f1e1]/50 to-transparent pointer-events-none" />
          
          {renderPassportContent(false)}
          
          {/* Apple Style Edit Trigger */}
          {isOwnProfile && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowEditPassport(true);
              }} 
              className="absolute right-3.5 top-3.5 p-2 rounded-full bg-white/40 shadow-sm border border-white/50 text-[#8e7d55] backdrop-blur-xl active:scale-90 transition-transform"
            >
              <Edit2 size={14} />
            </button>
          )}
        </motion.div>

        {/* Action Buttons for non-own profile */}
        {!isOwnProfile && (
          <div className="flex justify-center gap-4 mt-6">
            <button 
              onClick={() => effectiveUserId && handleAddFriend(effectiveUserId)}
              disabled={isFriend}
              className={`flex-1 h-12 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-apple-sm active:scale-95 transition-transform ${
                isFriend ? 'bg-apple-gray-100 text-apple-gray-400' : 
                requestItemPending ? 'bg-apple-gray-200 text-apple-gray-500' :
                'bg-apple-gray-600 text-white'
              }`}
            >
              {isFriend ? '已是好友' : requestItemPending ? '已發送請求' : <><UserPlus size={18} /> 加為好友</>}
            </button>
            <button 
              onClick={handleContact}
              className="flex-1 bg-white border border-apple-gray-100 text-apple-gray-600 h-12 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-apple-sm active:scale-95 transition-transform"
            >
              <MessageCircle size={18} /> 發送訊息
            </button>
          </div>
        )}

        {/* Full-screen Expanded Passport */}
        <AnimatePresence>
          {isPassportExpanded && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[600] bg-black flex items-center justify-center p-0 overflow-hidden"
              onClick={() => setIsPassportExpanded(false)}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <motion.div 
                  layoutId={`passport-card-${effectiveUserId}`}
                  initial={{ rotate: 0, scale: 0.5 }}
                  animate={{ rotate: 90, scale: 1 }}
                  exit={{ rotate: 0, scale: 0.5 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                  className="bg-[#fdfcf7] rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-[#e5e0d0] overflow-hidden flex flex-col relative"
                  style={{ 
                    // Calculate dimensions to fit landscape card in portrait screen after 90deg rotation.
                    // The element's HEIGHT becomes visual WIDTH.
                    // The element's WIDTH becomes visual HEIGHT.
                    height: '92vw', 
                    width: 'calc(92vw * 1.36)',
                    maxHeight: '94vh',
                    minWidth: 'min(125vw, 92vh)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Passport Texture Overlay */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }} />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#f4f1e1]/50 to-transparent pointer-events-none" />
                  
                  {renderPassportContent(true)}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs - New Style */}
        <div className="mt-8 border-b border-apple-gray-100 px-4">
          <div className="flex justify-between relative px-2">
            {[
              { id: 'trips', label: `旅程 (${myTrips.length})` },
              { id: 'saved', label: `收藏 (${savedTrips.length + savedBarPosts.length})` },
              { id: 'friends', label: `好友 (${profile?.friends?.length || 0})` },
              { id: 'posts', label: `發佈 (${postsCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-black transition-all relative ${
                  activeTab === tab.id ? 'text-apple-gray-900' : 'text-apple-gray-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId={`activeTab-${effectiveUserId}`}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-apple-gray-900 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 px-4 py-6 pb-32">
        {activeTab === 'trips' && (
          <div className="space-y-4">
            <div className="flex bg-apple-gray-50 p-1 rounded-xl mb-4">
              {(['ongoing', 'upcoming', 'past'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTripTab(tab)}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${tripTab === tab ? 'bg-white shadow-apple-xs text-apple-gray-900' : 'text-apple-gray-300'}`}
                >
                  {tab === 'ongoing' ? '進行中' : tab === 'upcoming' ? '即將到來' : '已結束'}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-300" />
              <input 
                type="text"
                placeholder="搜尋國家、城市、旅伴..."
                value={tripsSearch}
                onChange={e => setTripsSearch(e.target.value)}
                className="w-full bg-apple-gray-50 border border-apple-gray-100 rounded-xl pl-9 pr-4 h-10 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-4">
              {(() => {
                const s = tripsSearch.toLowerCase();
                const filtered = myTrips.filter(t => {
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${day}`;
                  
                  // Primary status filter
                  let statusMatch = false;
                  if (tripTab === 'ongoing') statusMatch = todayStr >= t.startDate && todayStr <= t.endDate;
                  else if (tripTab === 'upcoming') statusMatch = todayStr < t.startDate;
                  else statusMatch = todayStr > t.endDate;

                  if (!statusMatch) return false;

                  // Search filter
                  if (!s) return true;
                  const author = barAuthors[t.authorId];
                  return (
                    (t.country?.toLowerCase() || '').includes(s) ||
                    (t.cities || []).some(c => (c?.toLowerCase() || '').includes(s)) ||
                    (author?.displayName?.toLowerCase() || '').includes(s) ||
                    (author?.username?.toLowerCase() || '').includes(s) ||
                    (t.notes?.toLowerCase() || '').includes(s)
                  );
                }).sort((a,b) => a.startDate.localeCompare(b.startDate));

                if (!filtered.length) {
                  return (
                    <div className="text-center py-20 text-apple-gray-300 italic text-sm">
                      目前沒有{tripsSearch ? '相符' : '紀錄'}的旅程
                    </div>
                  );
                }

                return filtered.map(trip => (
                  <TripCard key={trip.id} trip={trip} onClick={() => onTripClick(trip.id)} />
                ));
              })()}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            <div className="flex bg-apple-gray-50 p-1 rounded-xl mb-4">
              <button
                onClick={() => setSavedTab('trips')}
                className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${savedTab === 'trips' ? 'bg-white shadow-apple-xs text-apple-gray-900' : 'text-apple-gray-300'}`}
              >
                旅程 ({savedTrips.length})
              </button>
              <button
                onClick={() => setSavedTab('posts')}
                className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${savedTab === 'posts' ? 'bg-white shadow-apple-xs text-apple-gray-900' : 'text-apple-gray-300'}`}
              >
                旅文 ({savedBarPosts.length})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-300" />
              <input 
                type="text"
                placeholder="搜尋國家、城市、旅伴..."
                value={savedSearch}
                onChange={e => setSavedSearch(e.target.value)}
                className="w-full bg-apple-gray-50 border border-apple-gray-100 rounded-xl pl-9 pr-4 h-10 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-4">
              {(() => {
                const s = savedSearch.toLowerCase();
                if (savedTab === 'trips') {
                  const filtered = savedTrips.filter(t => {
                    if (!s) return true;
                    const author = barAuthors[t.authorId];
                    return (
                      (t.country?.toLowerCase() || '').includes(s) ||
                      (t.cities || []).some(c => (c?.toLowerCase() || '').includes(s)) ||
                      (author?.displayName?.toLowerCase() || '').includes(s) ||
                      (author?.username?.toLowerCase() || '').includes(s) ||
                      (t.notes?.toLowerCase() || '').includes(s)
                    );
                  });
                  return filtered.length ? filtered.map(trip => (
                    <TripCard key={trip.id} trip={trip} onClick={() => onTripClick(trip.id)} />
                  )) : (
                    <div className="text-center py-20 text-apple-gray-300 italic text-sm">尚未收藏符合的旅程</div>
                  );
                } else {
                  const filtered = savedBarPosts.filter(post => {
                    if (!s) return true;
                    const author = barAuthors[post.authorId];
                    return (
                      (post.content?.toLowerCase() || '').includes(s) ||
                      (author?.displayName || '').toLowerCase().includes(s) ||
                      (author?.username || '').toLowerCase().includes(s)
                    );
                  });
                  return filtered.length ? filtered.map(post => (
                    <BarPostCard key={post.id} post={post} author={barAuthors[post.authorId]} />
                  )) : (
                    <div className="text-center py-20 text-apple-gray-300 italic text-sm">尚未收藏符合的旅文</div>
                  );
                }
              })()}
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-300" />
              <input 
                type="text"
                placeholder="搜尋好友姓名或 ID..."
                value={friendsSearch}
                onChange={e => setFriendsSearch(e.target.value)}
                className="w-full bg-apple-gray-50 border border-apple-gray-100 rounded-xl pl-9 pr-4 h-10 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-4">
              {(() => {
                const s = friendsSearch.toLowerCase();
                const filtered = firendsList.filter(f => {
                  if (!s) return true;
                  return (
                    (f.displayName?.toLowerCase() || '').includes(s) ||
                    (f.username?.toLowerCase() || '').includes(s)
                  );
                });
                return filtered.length ? filtered.map(f => (
                  <div key={f.uid} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-apple-gray-50 shadow-apple-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-apple-gray-50 overflow-hidden border border-apple-gray-100">
                        {f.avatarUrl && <img src={f.avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{f.displayName}</div>
                        <div className="text-[10px] text-apple-gray-300">@{f.username}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openChatWithFriend(f.uid)} className="text-apple-blue p-2 active:scale-90 transition-transform"><MessageCircle size={18} /></button>
                      <button 
                        onClick={() => {
                          if (Date.now() < skipFriendWarningUntil) {
                            // Directly remove
                            setGoodbyeFriend(f);
                            setTimeout(() => {
                              const btn = document.getElementById('direct-remove-trigger');
                              if (btn) btn.click();
                            }, 50);
                          } else {
                            setDontWarnAgain(false);
                            setGoodbyeFriend(f);
                          }
                        }} 
                        className="text-red-400 text-[10px] font-black px-3 py-1.5 bg-red-50 rounded-lg active:scale-95 transition-transform"
                      >
                        再見朋友
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 text-apple-gray-300 italic text-sm">尚無相符好友</div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div className="flex bg-apple-gray-50 p-1 rounded-xl mb-4">
              <button
                onClick={() => setPostTab('recruitment')}
                className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${postTab === 'recruitment' ? 'bg-white shadow-apple-xs text-apple-gray-900' : 'text-apple-gray-300'}`}
              >
                我的徵文
              </button>
              <button
                onClick={() => setPostTab('blog')}
                className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${postTab === 'blog' ? 'bg-white shadow-apple-xs text-apple-gray-900' : 'text-apple-gray-300'}`}
              >
                我的旅文
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-300" />
              <input 
                type="text"
                placeholder={postTab === 'recruitment' ? "搜尋國家、城市..." : "搜尋內容..."}
                value={postsSearch}
                onChange={e => setPostsSearch(e.target.value)}
                className="w-full bg-apple-gray-50 border border-apple-gray-100 rounded-xl pl-9 pr-4 h-10 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-4">
              {(() => {
                const s = postsSearch.toLowerCase();
                if (postTab === 'recruitment') {
                  const filtered = myTrips.filter(t => t.authorId === user?.uid).filter(t => {
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    
                    let statusMatch = false;
                    if (tripTab === 'ongoing') statusMatch = todayStr >= t.startDate && todayStr <= t.endDate;
                    else if (tripTab === 'upcoming') statusMatch = todayStr < t.startDate;
                    else statusMatch = todayStr > t.endDate;

                    if (!statusMatch) return false;
                    if (!s) return true;
                    
                    return (
                      (t.country?.toLowerCase() || '').includes(s) || 
                      (t.cities || []).some(c => (c?.toLowerCase() || '').includes(s)) ||
                      (profile?.displayName?.toLowerCase() || '').includes(s) ||
                      (profile?.username?.toLowerCase() || '').includes(s) ||
                      (t.notes?.toLowerCase() || '').includes(s)
                    );
                  });
                  return (
                    <>
                      <div className="flex bg-apple-gray-50/50 p-1 rounded-lg mb-2">
                        {(['ongoing', 'upcoming', 'past'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setTripTab(tab)}
                            className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${tripTab === tab ? 'bg-white shadow-apple-xs' : 'text-apple-gray-300'}`}
                          >
                            {tab === 'ongoing' ? '進行中' : tab === 'upcoming' ? '即將到來' : '已結束'}
                          </button>
                        ))}
                      </div>
                      {filtered.length ? filtered.map(trip => (
                        <TripCard key={trip.id} trip={trip} onClick={() => onTripClick(trip.id)} />
                      )) : (
                        <div className="text-center py-10 text-apple-gray-300 italic text-[10px]">無相符徵文</div>
                      )}
                    </>
                  );
                } else {
                  const filtered = myPosts.filter(post => {
                    if (!s) return true;
                    return (
                      (post.content?.toLowerCase() || '').includes(s) ||
                      (profile?.displayName?.toLowerCase() || '').includes(s) ||
                      (profile?.username?.toLowerCase() || '').includes(s)
                    );
                  });
                  return filtered.length ? filtered.map(post => (
                    <BarPostCard key={post.id} post={post} author={profile!} />
                  )) : (
                    <div className="text-center py-4 text-apple-gray-300 italic text-[10px]">無相符旅文</div>
                  );
                }
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Travel Footprint Detail Modal */}
      <AnimatePresence>
        {showFootprintDetail && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[250] bg-white pt-12 overflow-y-auto"
          >
            <div className="px-6 flex items-center justify-between mb-4 border-b border-apple-gray-50 pb-4 bg-white sticky top-0">
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-apple-blue" />
                <h2 className="text-lg font-bold">旅遊足跡</h2>
              </div>
              <button onClick={() => setShowFootprintDetail(false)} className="text-apple-gray-600 font-medium font-bold">關閉</button>
            </div>
            
            <div className="p-6">
              <div className="bg-apple-gray-50 rounded-[32px] p-8 flex flex-col items-center text-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-full bg-white shadow-apple-md flex items-center justify-center text-apple-blue">
                  <Globe size={40} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-4xl font-black text-apple-gray-900">{profile?.visitedCities || 0}</div>
                  <div className="text-xs font-black text-apple-gray-300 uppercase tracking-widest mt-1">Countries & Cities</div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-black text-apple-gray-900 border-l-4 border-apple-blue pl-3">足跡概覽</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-apple-gray-100 shadow-apple-xs flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-apple-gray-300 font-bold uppercase tracking-wider">最近造訪</div>
                      <div className="text-sm font-black text-apple-gray-900">{profile?.residence || '尚未記錄'}</div>
                    </div>
                  </div>
                  
                  <div className="text-center py-12 px-8 bg-apple-gray-50 rounded-2xl border border-dashed border-apple-gray-200">
                    <p className="text-xs text-apple-gray-300 font-medium leading-relaxed italic">
                      「世界是一本書，而不旅行的人只讀了其中一頁。」<br/>
                      快去探索更多未知的地方吧！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Information Modal for Footprint */}
      <AnimatePresence>
        {showFootprintInfo && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full relative"
            >
              <button 
                onClick={() => setShowFootprintInfo(false)}
                className="absolute top-4 right-4 p-2 text-apple-gray-300 hover:text-apple-gray-900 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-apple-gray-50 flex items-center justify-center text-apple-blue">
                  <Info size={32} />
                </div>
                <h3 className="text-lg font-black text-apple-gray-900">旅遊足跡</h3>
                <p className="text-apple-gray-500 leading-relaxed text-sm">
                  使用者去過的數量，點擊可查看更詳細的旅遊足跡。
                </p>
                <button 
                  onClick={() => setShowFootprintInfo(false)}
                  className="mt-4 w-full h-12 bg-apple-gray-900 text-white rounded-xl font-bold active:scale-95 transition-transform"
                >
                  知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goodbye Friend Confirmation Modal */}
      <AnimatePresence>
        {goodbyeFriend && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-4 border-apple-gray-50">
                  {goodbyeFriend.avatarUrl && <img src={goodbyeFriend.avatarUrl} className="w-full h-full object-cover" />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-apple-gray-900">是否要跟這位好友說再見？</h3>
                  <p className="text-apple-gray-500 text-sm leading-relaxed">
                    這意味著你將不再能直接揪 <b>{goodbyeFriend.displayName}</b> 一起旅行。
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="dont-warn-friend"
                      checked={dontWarnAgain}
                      onChange={(e) => setDontWarnAgain(e.target.checked)}
                      className="w-4 h-4 rounded text-apple-gray-900 focus:ring-apple-gray-900 border-apple-gray-200"
                    />
                    <label htmlFor="dont-warn-friend" className="text-[11px] font-bold text-apple-gray-400 select-none cursor-pointer">
                      五分鐘內不再提醒，再次點擊刪除朋友時，系統將直接刪除好友。
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    id="direct-remove-trigger"
                    onClick={async () => {
                      if (dontWarnAgain) {
                        setSkipFriendWarningUntil(Date.now() + 5 * 60 * 1000);
                      }
                      await removeFriend(goodbyeFriend.uid, true);
                      setGoodbyeFriend(null);
                    }}
                    className="w-full h-12 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    對啦！再見！
                  </button>
                  <button 
                    onClick={() => setGoodbyeFriend(null)}
                    className="w-full h-12 bg-apple-gray-50 text-apple-gray-400 rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    算了！再想想！
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My Trips Modal */}
      <AnimatePresence>
        {showMyTrips && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white pt-12 overflow-y-auto"
          >
            <div className="px-6 flex items-center justify-between mb-4 bg-white sticky top-0 border-b border-apple-gray-50 pb-2">
              <h2 className="text-lg font-bold">我的旅程</h2>
              <button onClick={() => setShowMyTrips(false)} className="text-apple-gray-600 font-medium">完成</button>
            </div>

            <div className="px-4 mb-4">
              <div className="flex bg-apple-gray-50 p-1 rounded-xl">
                {(['ongoing', 'upcoming', 'past'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTripTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tripTab === tab ? 'bg-white shadow-apple-sm text-apple-gray-900' : 'text-apple-gray-300'}`}
                  >
                    {tab === 'ongoing' ? '進行中' : tab === 'upcoming' ? '即將到來' : '已結束'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {(() => {
                const filtered = myTrips.filter(t => {
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${day}`;
                  
                  if (tripTab === 'ongoing') return todayStr >= t.startDate && todayStr <= t.endDate;
                  if (tripTab === 'upcoming') return todayStr < t.startDate;
                  return todayStr > t.endDate;
                }).sort((a,b) => a.startDate.localeCompare(b.startDate));

                if (!filtered.length) {
                  return (
                    <div className="text-center py-20 text-apple-gray-300 italic">
                      目前沒有{tripTab === 'ongoing' ? '進行中' : tripTab === 'upcoming' ? '即將到來' : '已結束'}的旅程
                    </div>
                  );
                }

                return filtered.map(trip => (
                  <TripCard key={trip.id} trip={trip} onClick={() => {
                    setShowMyTrips(false);
                    onTripClick(trip.id);
                  }} />
                ));
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Items Modal */}
      <AnimatePresence>
        {showSaved && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white pt-12 overflow-y-auto"
          >
            <div className="px-6 flex items-center justify-between mb-4 bg-white sticky top-0 border-b border-apple-gray-50 pb-2 z-10">
              <h2 className="text-lg font-bold text-apple-gray-900 border-none">收藏</h2>
              <button onClick={() => setShowSaved(false)} className="text-apple-gray-600 font-medium">完成</button>
            </div>

            <div className="px-5 mb-4">
              <div className="flex bg-apple-gray-50 p-1 rounded-2xl">
                <button
                  onClick={() => setSavedTab('trips')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${savedTab === 'trips' ? 'bg-white shadow-apple-sm text-apple-gray-900' : 'text-apple-gray-300'}`}
                >
                  旅程 ({savedTrips.length})
                </button>
                <button
                  onClick={() => setSavedTab('posts')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${savedTab === 'posts' ? 'bg-white shadow-apple-sm text-apple-gray-900' : 'text-apple-gray-300'}`}
                >
                  旅文 ({savedBarPosts.length})
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {savedTab === 'trips' ? (
                savedTrips.length ? savedTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} onClick={() => {
                    setShowSaved(false);
                    onTripClick(trip.id);
                  }} />
                )) : (
                  <div className="text-center py-20 text-apple-gray-300 italic">尚未收藏任何旅程</div>
                )
              ) : (
                savedBarPosts.length ? savedBarPosts.map(post => (
                  <BarPostCard key={post.id} post={post} author={barAuthors[post.authorId]} />
                )) : (
                  <div className="text-center py-20 text-apple-gray-300 italic">尚未收藏任何旅文</div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Items Modal */}
      <AnimatePresence>
        {showHiddenPosts && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white pt-12 overflow-y-auto"
          >
            <div className="px-6 flex items-center justify-between mb-4 bg-white sticky top-0 border-b border-apple-gray-50 pb-2 z-10">
              <h2 className="text-lg font-bold text-apple-gray-900 border-none">隱藏的貼文</h2>
              <button onClick={() => setShowHiddenPosts(false)} className="text-apple-gray-600 font-medium">完成</button>
            </div>

            <div className="px-5 mb-4">
              <div className="flex bg-apple-gray-50 p-1 rounded-2xl">
                <button
                  onClick={() => setHiddenTab('trips')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${hiddenTab === 'trips' ? 'bg-white shadow-apple-sm text-apple-gray-900' : 'text-apple-gray-300'}`}
                >
                  徵文 ({hiddenTripsData.length})
                </button>
                <button
                  onClick={() => setHiddenTab('posts')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${hiddenTab === 'posts' ? 'bg-white shadow-apple-sm text-apple-gray-900' : 'text-apple-gray-300'}`}
                >
                  旅文 ({hiddenBarPostsData.length})
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {hiddenTab === 'trips' ? (
                hiddenTripsData.length ? hiddenTripsData.map(trip => (
                  <div key={trip.id} className="relative">
                    <TripCard trip={trip} onClick={() => onTripClick(trip.id)} />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreItem(trip.id);
                      }}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-black text-apple-blue shadow-sm border border-apple-gray-50 active:scale-90 transition-transform"
                    >
                      恢復顯示
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-20 text-apple-gray-300 italic">目前沒有隱藏的徵文</div>
                )
              ) : (
                hiddenBarPostsData.length ? hiddenBarPostsData.map(post => (
                  <div key={post.id} className="relative">
                    <BarPostCard post={post} author={barAuthors[post.authorId]} />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreItem(post.id);
                      }}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-black text-apple-blue shadow-sm border border-apple-gray-50 active:scale-90 transition-transform"
                    >
                      恢復顯示
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-20 text-apple-gray-300 italic">目前沒有隱藏的旅文</div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
