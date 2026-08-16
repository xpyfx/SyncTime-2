import React, { useState, useEffect, useRef } from 'react';
import { 
  Plane, Plus, MapPin, Calendar, Users, Info, Map as MapIcon, X, Search, 
  Send, Globe, UserPlus, UserCheck, Wallet, Compass, Car, Building, FileText, Lock,
  PlaneTakeoff, Navigation 
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetLevel, SeekingGender, Trip, TripStatus, Accommodation } from '../types';
import { COUNTRIES, getCitiesByCountry } from '../lib/locationData';

const Label = ({ children, required = false, icon: Icon }: { children: React.ReactNode, required?: boolean, icon?: any }) => (
  <label className="block text-xs font-bold text-[#2B2B2B] tracking-wider mb-2 flex items-center gap-1.5">
    {Icon && <Icon size={16} className="text-[#035096] shrink-0" />}
    <span>{children}</span>
    {required && <span className="text-[#F4B896] text-sm font-black">*</span>}
  </label>
);

const Input = ({ className = '', hasError = false, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean, icon?: any }) => (
  <div className="relative w-full">
    {Icon && (
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#035096] pointer-events-none">
        <Icon size={18} />
      </div>
    )}
    <input 
      {...props} 
      className={`w-full h-12 liquid-glass-input ${Icon ? 'pl-11 pr-5' : 'px-5'} text-sm font-medium text-[#2B2B2B] placeholder:text-[#2B2B2B]/40 focus:outline-none transition-all ${
        hasError ? '!border-red-400 !bg-red-50/30 ring-2 ring-red-400/50' : ''
      } ${className}`}
    />
  </div>
);

const AutocompleteInput = ({ 
  value, 
  onChange, 
  placeholder, 
  suggestions, 
  icon: Icon,
  hasError = false
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string, 
  suggestions: string[],
  icon?: any,
  hasError?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && value.trim()) {
      const query = value.toLowerCase().trim();
      const matches = suggestions.filter(s => 
        s.toLowerCase().includes(query) && s.toLowerCase() !== query
      );
      setFiltered(matches.slice(0, 5)); // Limit to top 5
      setIsOpen(matches.length > 0);
    } else {
      setFiltered([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder}
          hasError={hasError}
          onFocus={() => {
            if (filtered.length > 0) setIsOpen(true);
          }}
        />
        {Icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#035096]">
            <Icon size={18} />
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="absolute top-full left-0 right-0 liquid-glass-card border border-white/90 rounded-2xl mt-2 shadow-2xl z-[200] overflow-hidden backdrop-blur-2xl p-1"
          >
            {filtered.map(s => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-4 py-3 text-sm hover:bg-white/70 rounded-xl transition-all border-b border-white/40 last:border-0 flex items-center gap-3 text-[#2B2B2B] font-semibold"
                onClick={() => {
                  onChange(s);
                  setIsOpen(false);
                }}
              >
                <Search size={14} className="text-[#035096] shrink-0" />
                <span>{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const CreateTripView: React.FC<{ onCancel: () => void, editingTrip?: Trip }> = ({ onCancel, editingTrip }) => {
  const { user } = useAuth();
  const [country, setCountry] = useState('');
  const [cities, setCities] = useState<string[]>(['']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAdjustable, setIsAdjustable] = useState(false);
  const [departureCountry, setDepartureCountry] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [totalPeople, setTotalPeople] = useState(1);
  const [recruitingCount, setRecruitingCount] = useState(1);
  const [seekingGender, setSeekingGender] = useState<SeekingGender>('男女');
  const [arrivalMethod, setArrivalMethod] = useState('');
  const [transportInfo, setTransportInfo] = useState('');
  const [accommodationStatus, setAccommodationStatus] = useState<'已定' | '待定'>('待定');
  const [accommodations, setAccommodations] = useState<Accommodation[]>([{ id: Math.random().toString(36).substr(2, 9), note: '', hotelName: '', address: '', mapLink: '' }]);
  const [notes, setNotes] = useState('');
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>('低價');
  const [isFriendsOnly, setIsFriendsOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (editingTrip) {
      setCountry(editingTrip.country);
      setCities(editingTrip.cities);
      setStartDate(editingTrip.startDate);
      setEndDate(editingTrip.endDate);
      setIsAdjustable(editingTrip.isAdjustable);
      setDepartureCountry(editingTrip.departureCountry || '');
      setDepartureCity(editingTrip.departureCity || '');
      setTotalPeople(editingTrip.totalPeople);
      setRecruitingCount(editingTrip.recruitingCount);
      setSeekingGender(editingTrip.seekingGender);
      setArrivalMethod(editingTrip.arrivalMethod || '');
      setTransportInfo(editingTrip.transportInfo || '');
      setAccommodationStatus(editingTrip.accommodationStatus);
      if (editingTrip.accommodations && editingTrip.accommodations.length > 0) {
        setAccommodations(editingTrip.accommodations);
      } else {
        setAccommodations([{ id: Math.random().toString(36).substr(2, 9), note: '', hotelName: '', address: '', mapLink: '' }]);
      }
      setNotes(editingTrip.notes);
      setBudgetLevel(editingTrip.budgetLevel);
      setIsFriendsOnly(editingTrip.isFriendsOnly || false);
    }
  }, [editingTrip]);

  const addCity = () => setCities([...cities, '']);
  const updateCity = (index: number, val: string) => {
    const newCities = [...cities];
    newCities[index] = val;
    setCities(newCities);
    if (fieldErrors.city) {
      setFieldErrors(prev => ({ ...prev, city: false }));
    }
  };
  const removeCity = (index: number) => {
    if (cities.length > 1) {
      setCities(cities.filter((_, i) => i !== index));
    }
  };

  const addAccommodation = () => setAccommodations([...accommodations, { id: Math.random().toString(36).substr(2, 9), note: '', hotelName: '', address: '', mapLink: '' }]);
  const removeAccommodation = (id: string) => {
    if (accommodations.length > 1) {
      setAccommodations(accommodations.filter(a => a.id !== id));
    }
  };
  const updateAccommodation = (id: string, field: keyof Accommodation, val: string) => {
    setAccommodations(accommodations.map(a => a.id === id ? { ...a, [field]: val } : a));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!user) {
      alert('請先登入帳號再發佈貼文');
      return;
    }

    const trimmedCountry = country.trim();
    const validCities = cities.map(c => c.trim()).filter(Boolean);
    const errors: Record<string, boolean> = {};
    const missingFields: string[] = [];

    if (!trimmedCountry) {
      errors.country = true;
      missingFields.push('預計前往國家');
    }
    if (validCities.length === 0) {
      errors.city = true;
      missingFields.push('預計前往城市');
    }
    if (!startDate) {
      errors.startDate = true;
      missingFields.push('預計旅遊開始日期');
    }
    if (!endDate) {
      errors.endDate = true;
      missingFields.push('預計旅遊結束日期');
    }

    if (missingFields.length > 0) {
      setFieldErrors(errors);
      alert(`請填寫以下必填欄位：\n• ${missingFields.join('\n• ')}`);
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFieldErrors({ startDate: true, endDate: true });
      alert('預計旅遊結束日期不能早於開始日期！');
      return;
    }

    if (totalPeople < 1) {
      alert('旅遊總人數至少需為 1 人');
      return;
    }

    if (recruitingCount < 1) {
      alert('預計徵旅伴人數至少需為 1 人');
      return;
    }

    if (recruitingCount > totalPeople) {
      alert('預計徵旅伴人數不能大於旅遊總人數');
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const path = editingTrip ? `trips/${editingTrip.id}` : 'trips';
    try {
      const tripData = {
        authorId: user.uid,
        country: trimmedCountry,
        cities: validCities,
        startDate,
        endDate,
        isAdjustable,
        departureCountry,
        departureCity,
        totalPeople: Number(totalPeople),
        recruitingCount: Number(recruitingCount),
        seekingGender,
        arrivalMethod,
        transportInfo,
        accommodationStatus,
        accommodations: accommodationStatus === '已定' ? accommodations.filter(a => a.address || a.note || a.hotelName) : [],
        notes,
        budgetLevel,
        isFriendsOnly,
        status: editingTrip ? editingTrip.status : '徵人中' as TripStatus,
        updatedAt: serverTimestamp(),
      };

      if (editingTrip) {
        const currentMembers = editingTrip.members || [];
        const updatedMembers = currentMembers.includes(user.uid) 
          ? currentMembers 
          : [user.uid, ...currentMembers];
        
        await updateDoc(doc(db, 'trips', editingTrip.id), {
          ...tripData,
          members: updatedMembers
        });
      } else {
        const docRef = await addDoc(collection(db, 'trips'), {
          ...tripData,
          createdAt: serverTimestamp(),
          commentsCount: 0,
          members: [user.uid],
        });

        // Create associated Group Chat Room
        const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
          type: 'group',
          tripId: docRef.id,
          name: `【${tripData.country}】旅友群聊`,
          participants: [user.uid],
          lastMessage: '歡迎加入旅程！本群提供各位旅友互相討論與安排行程使用。',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          authorId: user.uid
        });

        // Link back to trip
        await updateDoc(docRef, { chatRoomId: chatRoomRef.id });
      }
      onCancel();
    } catch (e) {
      handleFirestoreError(e, editingTrip ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-100/80 overflow-y-auto font-sans h-screen overscroll-contain relative">
      {/* Soft Floating Ambient Light Blobs for Glass Refraction */}
      <div className="fixed -top-16 -left-16 w-80 h-80 rounded-full bg-[#B6CADA]/50 blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed top-1/3 -right-20 w-96 h-96 rounded-full bg-[#F4B896]/35 blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 left-1/3 w-80 h-80 rounded-full bg-[#035096]/20 blur-3xl pointer-events-none" />

      {/* Sticky Header Bar */}
      <div className="sticky top-0 bg-white/60 backdrop-blur-2xl z-[130] px-6 pt-12 pb-4 flex items-center justify-between border-b border-white/80 shadow-[0_4px_24px_rgba(3,80,150,0.06)]">
        <button 
          type="button"
          onClick={onCancel} 
          className="w-10 h-10 rounded-full liquid-glass-btn-secondary flex items-center justify-center transition-transform active:scale-90 shadow-sm"
          title="關閉"
          aria-label="關閉"
        >
          <X size={20} className="text-[#035096] stroke-[2.5]" />
        </button>
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#2B2B2B]">{editingTrip ? '編輯貼文' : '發布徵旅伴'}</h1>
        <button 
          type="button"
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-10 h-10 rounded-full liquid-glass-btn-primary flex items-center justify-center disabled:opacity-50 transition-transform active:scale-90 shadow-md shrink-0"
          title={editingTrip ? '儲存' : '發布'}
          aria-label={editingTrip ? '儲存' : '發布'}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={18} className="stroke-[2.5] -rotate-12 translate-x-[-1px] translate-y-[1px]" />
          )}
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-6 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-40 relative z-10">
        {/* Destination Section */}
        <section className="liquid-glass-card p-5 sm:p-6 space-y-5">
          <div>
            <Label required icon={Globe}>預計前往國家（想避免翻譯問題者請填寫英文）</Label>
            <AutocompleteInput 
              value={country} 
              onChange={val => {
                setCountry(val);
                if (fieldErrors.country) setFieldErrors(prev => ({ ...prev, country: false }));
              }} 
              placeholder="例如：義大利"
              suggestions={COUNTRIES}
              icon={Globe}
              hasError={fieldErrors.country}
            />
            {fieldErrors.country && (
              <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">
                ⚠️ 請填寫預計前往國家
              </p>
            )}
          </div>
          <div>
            <Label required icon={MapPin}>預計前往城市</Label>
            <div className="space-y-3">
              {cities.map((city, index) => (
                <div key={index} className="flex gap-2.5 items-center">
                  <div className="flex-1">
                    <AutocompleteInput 
                      value={city} 
                      onChange={val => updateCity(index, val)} 
                      placeholder={`第 ${index + 1} 個城市`}
                      suggestions={country ? getCitiesByCountry(country) : []}
                      icon={MapPin}
                      hasError={fieldErrors.city && cities.filter(c => c.trim()).length === 0}
                    />
                  </div>
                  {cities.length > 1 && (
                    <button 
                      onClick={() => removeCity(index)} 
                      className="w-10 h-10 rounded-full liquid-glass-btn-secondary flex items-center justify-center text-red-500 hover:text-red-600 shrink-0"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {fieldErrors.city && (
                <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                  ⚠️ 請填寫至少一個預計前往城市
                </p>
              )}
              <button 
                onClick={addCity}
                className="liquid-glass-btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-1"
              >
                <Plus size={16} strokeWidth={2.5} /> 新增城市
              </button>
            </div>
          </div>
        </section>

        {/* Date Section */}
        <section className="liquid-glass-card p-5 sm:p-6 space-y-5">
          <Label required icon={Calendar}>預計旅遊日期</Label>
          <div className="flex flex-col gap-3">
            <div>
              <div className={`flex items-center gap-3 liquid-glass-input px-4 h-12 ${
                fieldErrors.startDate ? '!border-red-400 !bg-red-50/30 ring-2 ring-red-400/50' : ''
              }`}>
                <Calendar size={18} className={fieldErrors.startDate ? "text-red-400" : "text-[#035096]"} />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (fieldErrors.startDate) setFieldErrors(prev => ({ ...prev, startDate: false }));
                  }} 
                  className="flex-1 bg-transparent text-sm font-semibold text-[#2B2B2B] focus:outline-none"
                />
              </div>
              {fieldErrors.startDate && (
                <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1">
                  ⚠️ 請選擇預計旅遊開始日期
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <span className="bg-white/70 backdrop-blur-md px-4 py-1 rounded-full border border-white/90 text-xs font-bold text-[#035096] shadow-2xs">
                至
              </span>
            </div>

            <div>
              <div className={`flex items-center gap-3 liquid-glass-input px-4 h-12 ${
                fieldErrors.endDate ? '!border-red-400 !bg-red-50/30 ring-2 ring-red-400/50' : ''
              }`}>
                <Calendar size={18} className={fieldErrors.endDate ? "text-red-400" : "text-[#035096]"} />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => {
                    setEndDate(e.target.value);
                    if (fieldErrors.endDate) setFieldErrors(prev => ({ ...prev, endDate: false }));
                  }} 
                  className="flex-1 bg-transparent text-sm font-semibold text-[#2B2B2B] focus:outline-none"
                />
              </div>
              {fieldErrors.endDate && (
                <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1">
                  ⚠️ 請選擇預計旅遊結束日期
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 cursor-pointer" onClick={() => setIsAdjustable(!isAdjustable)}>
            <div className={`w-6 h-6 rounded-lg transition-all duration-300 flex items-center justify-center border ${
              isAdjustable 
                ? 'bg-gradient-to-b from-[#0462B7] to-[#035096] border-white/80 shadow-[0_4px_12px_rgba(3,80,150,0.35),inset_0_1px_1px_rgba(255,255,255,0.8)]' 
                : 'bg-white/60 border-white/90 shadow-inner'
            }`}>
              {isAdjustable && (
                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 text-white stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              )}
            </div>
            <input 
              type="checkbox" 
              id="adjustable" 
              checked={isAdjustable} 
              onChange={e => setIsAdjustable(e.target.checked)}
              className="hidden"
            />
            <label htmlFor="adjustable" className="text-xs font-bold text-[#2B2B2B] cursor-pointer select-none">可調整時間</label>
          </div>
        </section>

        {/* Departure Section */}
        <section className="liquid-glass-card p-5 sm:p-6 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label icon={PlaneTakeoff}>出發國家</Label>
            <AutocompleteInput 
              value={departureCountry} 
              onChange={setDepartureCountry} 
              suggestions={COUNTRIES}
              icon={PlaneTakeoff}
            />
          </div>
          <div className="space-y-2">
            <Label icon={Navigation}>出發城市</Label>
            <AutocompleteInput 
              value={departureCity} 
              onChange={setDepartureCity} 
              suggestions={departureCountry ? getCitiesByCountry(departureCountry) : []}
              icon={Navigation}
            />
          </div>
        </section>

        {/* Numbers Section */}
        <section className="liquid-glass-card p-5 sm:p-6 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label icon={Users}>旅遊總人數</Label>
            <Input type="number" min={1} value={totalPeople} onChange={e => setTotalPeople(Number(e.target.value))} icon={Users} />
          </div>
          <div className="space-y-2">
            <Label icon={UserPlus}>預計徵旅伴人數</Label>
            <Input type="number" min={1} value={recruitingCount} onChange={e => setRecruitingCount(Number(e.target.value))} icon={UserPlus} />
          </div>
        </section>

        {/* Gender & Budget Section */}
        <section className="liquid-glass-card p-5 sm:p-6 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label icon={UserCheck}>徵旅伴性別</Label>
            <div className="relative">
              <select 
                value={seekingGender} 
                onChange={e => setSeekingGender(e.target.value as SeekingGender)}
                className="w-full h-12 liquid-glass-input px-5 text-sm font-semibold text-[#2B2B2B] focus:outline-none appearance-none cursor-pointer pr-10"
              >
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="男女">男女</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#035096] text-xs">
                ▼
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label icon={Wallet}>旅遊預算</Label>
            <div className="relative">
              <select 
                value={budgetLevel} 
                onChange={e => setBudgetLevel(e.target.value as BudgetLevel)}
                className="w-full h-12 liquid-glass-input px-5 text-sm font-semibold text-[#2B2B2B] focus:outline-none appearance-none cursor-pointer pr-10"
              >
                <option value="低價">低價旅遊</option>
                <option value="中價">中價旅遊</option>
                <option value="高價">高價旅遊</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#035096] text-xs">
                ▼
              </div>
            </div>
          </div>
        </section>

        {/* Arrival & Transport Section */}
        <section className="liquid-glass-card p-5 sm:p-6 space-y-4">
          <div>
            <Label icon={Compass}>抵達目的地方式</Label>
            <Input value={arrivalMethod} onChange={e => setArrivalMethod(e.target.value)} placeholder="如：飛機、高鐵" icon={Compass} />
          </div>
          <div>
            <Label icon={Car}>交通資訊</Label>
            <Input value={transportInfo} onChange={e => setTransportInfo(e.target.value)} placeholder="如：航空公司｜航班號" icon={Car} />
          </div>
        </section>

        {/* Accommodation Section */}
        <section className="liquid-glass-card p-5 sm:p-6 space-y-4">
          <Label icon={Building}>住宿安排</Label>
          <div className="liquid-glass-segmented flex p-1.5 gap-1.5">
            <button 
              onClick={() => setAccommodationStatus('已定')}
              className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                accommodationStatus === '已定' ? 'liquid-glass-segment-active' : 'text-[#2B2B2B]/70 hover:text-[#2B2B2B]'
              }`}
            >
              已定
            </button>
            <button 
              onClick={() => setAccommodationStatus('待定')}
              className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                accommodationStatus === '待定' ? 'liquid-glass-segment-active' : 'text-[#2B2B2B]/70 hover:text-[#2B2B2B]'
              }`}
            >
              待定
            </button>
          </div>

          {accommodationStatus === '已定' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
              {accommodations.map((acc, index) => (
                <div key={acc.id} className="p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs relative space-y-3">
                  <div className="flex gap-2.5">
                    <div className="flex-[2]">
                      <input 
                        value={acc.note} 
                        onChange={e => updateAccommodation(acc.id, 'note', e.target.value)} 
                        placeholder="第一天 / 城市" 
                        className="w-full h-10 liquid-glass-input px-3.5 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex-[3]">
                      <input 
                        value={acc.hotelName} 
                        onChange={e => updateAccommodation(acc.id, 'hotelName', e.target.value)} 
                        placeholder="酒店名稱" 
                        className="w-full h-10 liquid-glass-input px-3.5 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    {accommodations.length > 1 && (
                      <button onClick={() => removeAccommodation(acc.id)} className="w-10 h-10 rounded-full liquid-glass-btn-secondary flex items-center justify-center text-red-500 shrink-0">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input 
                      value={acc.address} 
                      onChange={e => updateAccommodation(acc.id, 'address', e.target.value)} 
                      placeholder="住宿地址" 
                      icon={Building}
                    />
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#035096]">
                        <MapIcon size={16} />
                      </div>
                      <input 
                        value={acc.mapLink} 
                        onChange={e => updateAccommodation(acc.id, 'mapLink', e.target.value)} 
                        placeholder="Google Map 連結" 
                        className="w-full h-12 liquid-glass-input pl-11 pr-4 text-sm font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={addAccommodation}
                className="liquid-glass-btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={16} strokeWidth={2.5} /> 新增住宿
              </button>
            </motion.div>
          )}
        </section>

        {/* Notes & Privacy Section */}
        <section className="liquid-glass-card p-5 sm:p-6 space-y-5">
          <div>
            <Label icon={FileText}>備註 (Note)</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full h-32 liquid-glass-input rounded-2xl p-4 text-sm font-medium text-[#2B2B2B] placeholder:text-[#2B2B2B]/40 focus:outline-none resize-none"
              placeholder="寫下你的要求或期待..."
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs">
            <div className="flex flex-col pr-3">
              <span className="text-sm font-bold text-[#2B2B2B] flex items-center gap-1.5">
                <Lock size={16} className="text-[#035096]" />
                僅對好友展示
              </span>
              <span className="text-xs font-medium text-[#2B2B2B]/60 mt-0.5">開啟後，只有您的好友能看見此徵旅伴訊息</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFriendsOnly(!isFriendsOnly)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none shrink-0 ${
                isFriendsOnly 
                  ? 'bg-gradient-to-r from-[#0462B7] to-[#035096] border-1.5 border-white/80 shadow-[0_4px_16px_rgba(3,80,150,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.6)]' 
                  : 'bg-slate-200/80 border-1.5 border-white/80 shadow-inner'
              }`}
            >
              <motion.span
                animate={{ x: isFriendsOnly ? 26 : 3 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-block h-6 w-6 rounded-full bg-gradient-to-b from-white to-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,1)]"
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
