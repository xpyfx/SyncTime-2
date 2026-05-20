import React, { useState, useEffect, useRef } from 'react';
import { Plane, Plus, MapPin, Calendar, Users, Info, Map as MapIcon, X, Search } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetLevel, SeekingGender, Trip, TripStatus, Accommodation } from '../types';
import { COUNTRIES, getCitiesByCountry } from '../lib/locationData';

const Label = ({ children, required = false }: { children: React.ReactNode, required?: boolean }) => (
  <label className="block text-sm font-medium text-apple-gray-400 mb-2">
    {children} {required && <span className="text-red-400">*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className="w-full h-12 bg-apple-gray-50 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-apple-gray-200"
  />
);

const AutocompleteInput = ({ 
  value, 
  onChange, 
  placeholder, 
  suggestions, 
  icon: Icon 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string, 
  suggestions: string[],
  icon?: any
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
          onFocus={() => {
            if (filtered.length > 0) setIsOpen(true);
          }}
        />
        {Icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-gray-300">
            <Icon size={16} />
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-white border border-apple-gray-100/50 rounded-xl mt-2 shadow-xl z-[200] overflow-hidden backdrop-blur-xl"
          >
            {filtered.map(s => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-5 py-3.5 text-sm hover:bg-apple-gray-50 transition-colors border-b border-apple-gray-100 last:border-0 flex items-center gap-3"
                onClick={() => {
                  onChange(s);
                  setIsOpen(false);
                }}
              >
                <Search size={14} className="text-apple-gray-300 shrink-0" />
                <span className="text-apple-gray-600 font-medium">{s}</span>
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
    if (!country || cities.some(c => !c) || !startDate || !endDate || !user) {
      alert('請填寫必填欄位');
      return;
    }

    setIsSubmitting(true);
    const path = editingTrip ? `trips/${editingTrip.id}` : 'trips';
    try {
      const tripData = {
        authorId: user.uid,
        country,
        cities: cities.filter(c => c),
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
        accommodations: accommodationStatus === '已定' ? accommodations.filter(a => a.address || a.note) : [],
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
    <div className="fixed inset-0 z-[120] bg-white overflow-y-auto font-sans h-screen overscroll-contain">
      <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-[130] px-6 pt-12 pb-4 flex items-center justify-between border-b border-apple-gray-100/50">
        <button onClick={onCancel} className="text-apple-gray-300 font-medium text-sm">取消</button>
        <h1 className="text-lg font-bold tracking-tight">{editingTrip ? '編輯貼文' : '發布徵旅伴'}</h1>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className={`font-bold text-sm transition-opacity ${isSubmitting ? 'text-apple-blue/50' : 'text-apple-blue'}`}
        >
          {isSubmitting ? '儲存中...' : (editingTrip ? '儲存' : '發布')}
        </button>
      </div>

      <div className="p-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-40">
        {/* Destination */}
        <section className="space-y-4">
          <div>
            <Label required>預計前往國家（想避免翻譯問題者請填寫英文）</Label>
            <AutocompleteInput 
              value={country} 
              onChange={setCountry} 
              placeholder="例如：義大利"
              suggestions={COUNTRIES}
            />
          </div>
          <div>
            <Label required>預計前往城市</Label>
            <div className="space-y-3">
              {cities.map((city, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <AutocompleteInput 
                      value={city} 
                      onChange={val => updateCity(index, val)} 
                      placeholder={`第 ${index + 1} 個城市`}
                      suggestions={country ? getCitiesByCountry(country) : []}
                    />
                  </div>
                  {cities.length > 1 && (
                    <button onClick={() => removeCity(index)} className="p-2 text-red-300">
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={addCity}
                className="flex items-center gap-1 text-sm text-apple-gray-400 font-medium py-2 hover:text-apple-gray-600 transition-colors"
              >
                <Plus size={16} /> 新增城市
              </button>
            </div>
          </div>
        </section>

        {/* Date */}
        <section className="space-y-4">
          <Label required>預計旅遊日期</Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-apple-gray-50 rounded-xl px-4 h-12">
              <Calendar size={18} className="text-apple-gray-300" />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-center">
              <span className="text-apple-gray-300 text-sm font-medium">至</span>
            </div>
            <div className="flex items-center gap-3 bg-apple-gray-50 rounded-xl px-4 h-12">
              <Calendar size={18} className="text-apple-gray-300" />
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="adjustable" 
              checked={isAdjustable} 
              onChange={e => setIsAdjustable(e.target.checked)}
              className="w-5 h-5 rounded border-apple-gray-200 text-apple-gray-600 focus:ring-apple-gray-100"
            />
            <label htmlFor="adjustable" className="text-sm text-apple-gray-400">可調整時間</label>
          </div>
        </section>

        {/* Departure */}
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>出發國家</Label>
            <AutocompleteInput 
              value={departureCountry} 
              onChange={setDepartureCountry} 
              suggestions={COUNTRIES}
            />
          </div>
          <div className="space-y-2">
            <Label>出發城市</Label>
            <AutocompleteInput 
              value={departureCity} 
              onChange={setDepartureCity} 
              suggestions={departureCountry ? getCitiesByCountry(departureCountry) : []}
            />
          </div>
        </section>

        {/* Numbers */}
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>旅遊總人數</Label>
            <Input type="number" min={1} value={totalPeople} onChange={e => setTotalPeople(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>預計徵旅伴人數</Label>
            <Input type="number" min={1} value={recruitingCount} onChange={e => setRecruitingCount(Number(e.target.value))} />
          </div>
        </section>

        {/* Gender & Budget */}
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>徵旅伴性別</Label>
            <select 
              value={seekingGender} 
              onChange={e => setSeekingGender(e.target.value as SeekingGender)}
              className="w-full h-12 bg-apple-gray-50 rounded-xl px-4 text-sm focus:outline-none appearance-none"
            >
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="男女">男女</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>旅遊預算</Label>
            <select 
              value={budgetLevel} 
              onChange={e => setBudgetLevel(e.target.value as BudgetLevel)}
              className="w-full h-12 bg-apple-gray-50 rounded-xl px-4 text-sm focus:outline-none appearance-none"
            >
              <option value="低價">低價旅遊</option>
              <option value="中價">中價旅遊</option>
              <option value="高價">高價旅遊</option>
            </select>
          </div>
        </section>

        {/* Arrival & Transport */}
        <section className="space-y-4">
          <div>
            <Label>抵達目的地方式</Label>
            <Input value={arrivalMethod} onChange={e => setArrivalMethod(e.target.value)} placeholder="如：飛機、高鐵" />
          </div>
          <div>
            <Label>交通資訊</Label>
            <Input value={transportInfo} onChange={e => setTransportInfo(e.target.value)} placeholder="如：航空公司｜航班號" />
          </div>
        </section>

        {/* Accommodation */}
        <section className="space-y-4">
          <Label>住宿安排</Label>
          <div className="flex bg-apple-gray-50 rounded-xl p-1">
            <button 
              onClick={() => setAccommodationStatus('已定')}
              className={`flex-1 py-2 text-sm rounded-lg transition-all ${accommodationStatus === '已定' ? 'bg-white shadow text-apple-gray-600 font-semibold' : 'text-apple-gray-300'}`}
            >
              已定
            </button>
            <button 
              onClick={() => setAccommodationStatus('待定')}
              className={`flex-1 py-2 text-sm rounded-lg transition-all ${accommodationStatus === '待定' ? 'bg-white shadow text-apple-gray-600 font-semibold' : 'text-apple-gray-300'}`}
            >
              待定
            </button>
          </div>
          {accommodationStatus === '已定' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
              {accommodations.map((acc, index) => (
                <div key={acc.id} className="p-4 bg-apple-gray-50/50 rounded-2xl border border-apple-gray-100/50 relative">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-[2]">
                      <input 
                        value={acc.note} 
                        onChange={e => updateAccommodation(acc.id, 'note', e.target.value)} 
                        placeholder="第一天 / 城市" 
                        className="w-full h-10 bg-white rounded-lg px-3 text-xs focus:outline-none border border-apple-gray-100"
                      />
                    </div>
                    <div className="flex-[3]">
                      <input 
                        value={acc.hotelName} 
                        onChange={e => updateAccommodation(acc.id, 'hotelName', e.target.value)} 
                        placeholder="酒店名稱" 
                        className="w-full h-10 bg-white rounded-lg px-3 text-xs focus:outline-none border border-apple-gray-100"
                      />
                    </div>
                    {accommodations.length > 1 && (
                      <button onClick={() => removeAccommodation(acc.id)} className="p-2 text-red-300">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input 
                      value={acc.address} 
                      onChange={e => updateAccommodation(acc.id, 'address', e.target.value)} 
                      placeholder="住宿地址" 
                    />
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-gray-300">
                        <MapIcon size={16} />
                      </div>
                      <input 
                        value={acc.mapLink} 
                        onChange={e => updateAccommodation(acc.id, 'mapLink', e.target.value)} 
                        placeholder="Google Map 連結" 
                        className="w-full h-12 bg-apple-gray-50 rounded-xl pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-apple-gray-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={addAccommodation}
                className="flex items-center gap-1 text-sm text-apple-gray-400 font-medium py-2 hover:text-apple-gray-600 transition-colors w-full justify-center"
              >
                <Plus size={16} /> 新增住宿
              </button>
            </motion.div>
          )}
        </section>

        {/* Notes */}
        <section className="space-y-4">
          <div>
            <Label>備註 (Note)</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full h-32 bg-apple-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-apple-gray-200 resize-none"
              placeholder="寫下你的要求或期待..."
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-apple-gray-50/50 rounded-2xl border border-apple-gray-100/30">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-apple-gray-600">僅對好友展示。</span>
              <span className="text-[10px] text-apple-gray-300">開啟後，只有您的好友能看見此徵旅伴訊息</span>
            </div>
            <button
              onClick={() => setIsFriendsOnly(!isFriendsOnly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isFriendsOnly ? 'bg-apple-blue' : 'bg-apple-gray-200'
              }`}
            >
              <motion.span
                animate={{ x: isFriendsOnly ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
