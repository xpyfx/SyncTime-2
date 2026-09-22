import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, X, Navigation, Star, Send, ExternalLink, Loader2, Compass } from 'lucide-react';
import { useMapsLibrary, useApiIsLoaded, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { LocationData } from '../types';

interface GoogleMapsLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (location: LocationData) => void;
}

interface PlaceItem {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  categoryLabel?: string;
  prediction?: any;
}

// Curated popular locations with accurate Google Maps queries as instant recommendations
const POPULAR_RECOMMENDATIONS: PlaceItem[] = [
  {
    id: 'rec_1',
    name: '台北 101 (Taipei 101)',
    address: '台灣台北市信義區信義路五段7號',
    lat: 25.033964,
    lng: 121.564472,
    rating: 4.6,
    userRatingCount: 38200,
    googleMapsUri: 'https://maps.google.com/?cid=12686154388481489025',
    categoryLabel: '🏢 城市地標'
  },
  {
    id: 'rec_2',
    name: '東京鐵塔 (Tokyo Tower)',
    address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo 105-0011 日本',
    lat: 35.658581,
    lng: 139.745433,
    rating: 4.5,
    userRatingCount: 78500,
    googleMapsUri: 'https://maps.google.com/?cid=10334800366472147318',
    categoryLabel: '🗼 經典名勝'
  },
  {
    id: 'rec_3',
    name: '清水寺 (Kiyomizu-dera)',
    address: '1 Chome-294 Kiyomizu, Higashiyama Ward, Kyoto 605-0862 日本',
    lat: 34.994857,
    lng: 135.785046,
    rating: 4.7,
    userRatingCount: 52100,
    googleMapsUri: 'https://maps.google.com/?cid=15610014022830842323',
    categoryLabel: '⛩️ 世界遺產'
  },
  {
    id: 'rec_4',
    name: '新加坡濱海灣金沙 (Marina Bay Sands)',
    address: '10 Bayfront Ave, Singapore 018956',
    lat: 1.283375,
    lng: 103.860726,
    rating: 4.7,
    userRatingCount: 65400,
    googleMapsUri: 'https://maps.google.com/?cid=8943793740263351744',
    categoryLabel: '🏨 奢華地標'
  },
  {
    id: 'rec_5',
    name: '一蘭拉麵 澀谷店 (Ichiran Shibuya)',
    address: '東京都澀谷區神南1-22-7 岩本大樓 B1F',
    lat: 35.661777,
    lng: 139.700688,
    rating: 4.4,
    userRatingCount: 14200,
    googleMapsUri: 'https://maps.google.com/?q=Ichiran+Shibuya',
    categoryLabel: '🍜 必吃美食'
  },
  {
    id: 'rec_6',
    name: '巴黎艾菲爾鐵塔 (Eiffel Tower)',
    address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, 法國',
    lat: 48.858370,
    lng: 2.294481,
    rating: 4.7,
    userRatingCount: 360000,
    googleMapsUri: 'https://maps.google.com/?cid=16972074360677117865',
    categoryLabel: '🗼 世界奇景'
  }
];

export const GoogleMapsLocationModal: React.FC<GoogleMapsLocationModalProps> = ({
  isOpen,
  onClose,
  onSendLocation
}) => {
  const isApiLoaded = useApiIsLoaded();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Custom manual entry fields
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  // Autocomplete session token
  const sessionTokenRef = useRef<any>(null);

  // Initialize or reset session token
  const getSessionToken = useCallback(() => {
    if (placesLib && (placesLib as any).AutocompleteSessionToken) {
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new (placesLib as any).AutocompleteSessionToken();
      }
      return sessionTokenRef.current;
    }
    return null;
  }, [placesLib]);

  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  // Handle Search Input with debounce & Google Places API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (placesLib) {
          // 1. Modern AutocompleteSuggestion API (Places API New)
          if ((placesLib as any).AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
            const token = getSessionToken();
            const request: any = {
              input: searchQuery.trim(),
              internalUsageAttributionIds: ['gmp_git_agentskills_v1']
            };
            if (token) request.sessionToken = token;

            const res = await (placesLib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            if (res && res.suggestions && res.suggestions.length > 0) {
              const items: PlaceItem[] = res.suggestions.slice(0, 8).map((s: any, idx: number) => {
                const pred = s.placePrediction;
                const mainText = pred?.mainText?.text || pred?.structuredFormat?.mainText?.text || pred?.text?.text || searchQuery;
                const secondaryText = pred?.secondaryText?.text || pred?.structuredFormat?.secondaryText?.text || '';
                return {
                  id: `gmp_${pred?.placeId || idx}`,
                  name: mainText,
                  address: secondaryText,
                  prediction: pred,
                  categoryLabel: '📍 Google 地圖地標'
                };
              });
              setSearchResults(items);
              setIsSearching(false);
              return;
            }
          }

          // 2. Classic AutocompleteService fallback
          if ((placesLib as any).AutocompleteService) {
            const autoService = new (placesLib as any).AutocompleteService();
            autoService.getPlacePredictions(
              {
                input: searchQuery.trim(),
                componentRestrictions: undefined
              },
              (predictions: any[] | null, status: any) => {
                if (status === 'OK' && predictions && predictions.length > 0) {
                  const items: PlaceItem[] = predictions.slice(0, 8).map((p, idx) => ({
                    id: p.place_id || `gmp_legacy_${idx}`,
                    name: p.structured_formatting?.main_text || p.description,
                    address: p.structured_formatting?.secondary_text || p.description,
                    categoryLabel: '📍 Google 地圖地標',
                    prediction: p
                  }));
                  setSearchResults(items);
                } else {
                  // Fallback match in curated list
                  const matched = POPULAR_RECOMMENDATIONS.filter(r => 
                    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.address.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  setSearchResults(matched);
                }
                setIsSearching(false);
              }
            );
            return;
          }
        }

        // If Places library is not yet initialized or network error, fallback to curated list
        const matched = POPULAR_RECOMMENDATIONS.filter(r => 
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(matched);
      } catch (err) {
        console.warn('Google Maps Autocomplete search error:', err);
        const matched = POPULAR_RECOMMENDATIONS.filter(r => 
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(matched);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, placesLib, getSessionToken]);

  // When user selects a suggestion, fetch full Place Details
  const handleSelectSuggestion = async (item: PlaceItem) => {
    if (item.lat && item.lng) {
      setSelectedPlace(item);
      return;
    }

    try {
      if (item.prediction && typeof item.prediction.toPlace === 'function') {
        const place = item.prediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'googleMapsURI']
        });

        const lat = typeof place.location?.lat === 'function' ? place.location.lat() : place.location?.lat;
        const lng = typeof place.location?.lng === 'function' ? place.location.lng() : place.location?.lng;

        const resolvedItem: PlaceItem = {
          ...item,
          name: place.displayName || item.name,
          address: place.formattedAddress || item.address,
          lat,
          lng,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          googleMapsUri: place.googleMapsURI || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`
        };

        setSelectedPlace(resolvedItem);
        resetSessionToken();
        return;
      }

      // Classic PlacesService fallback if placeId exists
      const placeId = item.prediction?.place_id || (item.id.startsWith('gmp_') ? item.id.replace('gmp_', '') : null);
      if (placesLib && placeId) {
        const dummyDiv = document.createElement('div');
        const service = new (placesLib as any).PlacesService(dummyDiv);
        service.getDetails({ placeId, fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'url'] }, (res: any, status: any) => {
          if (status === 'OK' && res) {
            setSelectedPlace({
              ...item,
              name: res.name || item.name,
              address: res.formatted_address || item.address,
              lat: res.geometry?.location?.lat(),
              lng: res.geometry?.location?.lng(),
              rating: res.rating,
              userRatingCount: res.user_ratings_total,
              googleMapsUri: res.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`
            });
          } else {
            setSelectedPlace(item);
          }
        });
        return;
      }

      // Geocoder fallback if coordinates are missing
      if (geocodingLib) {
        const geocoder = new (geocodingLib as any).Geocoder();
        geocoder.geocode({ address: `${item.name} ${item.address}`.trim() }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            setSelectedPlace({
              ...item,
              lat: loc.lat(),
              lng: loc.lng(),
              address: results[0].formatted_address || item.address,
              googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`
            });
          } else {
            setSelectedPlace(item);
          }
        });
        return;
      }

      setSelectedPlace(item);
    } catch (e) {
      console.warn('Failed to fetch place details:', e);
      setSelectedPlace(item);
    }
  };

  // Get current user GPS location via browser + Geocoder
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('您的裝置或瀏覽器不支援定位功能');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (geocodingLib) {
          const geocoder = new (geocodingLib as any).Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
            setIsLocating(false);
            if (status === 'OK' && results && results[0]) {
              const item: PlaceItem = {
                id: `gps_${Date.now()}`,
                name: '📍 我的即時位置',
                address: results[0].formatted_address,
                lat: latitude,
                lng: longitude,
                googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
                categoryLabel: '🧭 即時定位'
              };
              setSelectedPlace(item);
            } else {
              const item: PlaceItem = {
                id: `gps_${Date.now()}`,
                name: '📍 我的即時位置',
                address: `經緯度: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                lat: latitude,
                lng: longitude,
                googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
                categoryLabel: '🧭 即時定位'
              };
              setSelectedPlace(item);
            }
          });
        } else {
          setIsLocating(false);
          const item: PlaceItem = {
            id: `gps_${Date.now()}`,
            name: '📍 我的即時位置',
            address: `經緯度: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            lat: latitude,
            lng: longitude,
            googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
            categoryLabel: '🧭 即時定位'
          };
          setSelectedPlace(item);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('無法取得目前位置，請確認瀏覽器定位權限。');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Submit and send location
  const handleConfirmSend = (place: PlaceItem) => {
    const locData: LocationData = {
      id: 'loc_' + Date.now(),
      name: place.name || '地點資訊',
      address: place.address || '',
      query: `${place.name || ''} ${place.address || ''}`.trim(),
      placeId: place.id || '',
      googleMapsUri: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || place.address || '地點')}`,
      createdAt: new Date().toISOString()
    };

    if (typeof place.lat === 'number' && !isNaN(place.lat)) {
      locData.lat = place.lat;
    }
    if (typeof place.lng === 'number' && !isNaN(place.lng)) {
      locData.lng = place.lng;
    }
    if (typeof place.rating === 'number' && !isNaN(place.rating)) {
      locData.rating = place.rating;
    }
    if (typeof place.userRatingCount === 'number' && !isNaN(place.userRatingCount)) {
      locData.userRatingCount = place.userRatingCount;
    }

    onSendLocation(locData);
    onClose();
  };

  if (!isOpen) return null;

  const displayedList = searchQuery.trim() ? searchResults : POPULAR_RECOMMENDATIONS;

  return (
    <div id="google-maps-location-modal-overlay" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        id="google-maps-location-modal"
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 shadow-2xl border border-apple-gray-100 relative max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <MapPin size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-apple-gray-900 text-base leading-tight">Google Maps 地點</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                  {isApiLoaded ? '即時地圖庫' : '載入中...'}
                </span>
              </div>
              <p className="text-[11px] text-apple-gray-400 font-medium">即時搜尋全世界地標、餐廳、飯店與景點</p>
            </div>
          </div>
          <button
            id="btn-close-location-modal"
            onClick={onClose}
            className="text-apple-gray-400 hover:text-apple-gray-700 p-1.5 rounded-full hover:bg-apple-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Place Highlight Card with Google Map Preview */}
        <AnimatePresence>
          {selectedPlace && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 flex-shrink-0 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 overflow-hidden shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-apple-gray-900 text-sm truncate">{selectedPlace.name}</span>
                    {selectedPlace.rating && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        {selectedPlace.rating.toFixed(1)}
                        {selectedPlace.userRatingCount && (
                          <span className="text-apple-gray-400 text-[9px]">({selectedPlace.userRatingCount > 1000 ? `${(selectedPlace.userRatingCount / 1000).toFixed(0)}k` : selectedPlace.userRatingCount})</span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-apple-gray-600 mt-0.5 line-clamp-1">{selectedPlace.address}</p>
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-apple-gray-400 hover:text-apple-gray-600 p-1"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Interactive Google Map Preview Container */}
              {selectedPlace.lat && selectedPlace.lng && (
                <div className="w-full h-32 rounded-xl overflow-hidden mb-2.5 relative border border-emerald-200/60 shadow-2xs">
                  <Map
                    mapId="DEMO_MAP_ID"
                    defaultCenter={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                    center={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                    defaultZoom={15}
                    gestureHandling="cooperative"
                    disableDefaultUI={true}
                    className="w-full h-full"
                  >
                    <AdvancedMarker position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}>
                      <Pin background="#10B981" borderColor="#065F46" glyphColor="#FFFFFF" scale={1.1} />
                    </AdvancedMarker>
                  </Map>
                  <a
                    href={selectedPlace.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-[10px] font-bold text-emerald-800 px-2 py-1 rounded-lg border border-black/5 shadow-xs flex items-center gap-1 hover:bg-white transition-colors"
                  >
                    <span>在 Google Maps 開啟</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              {/* Confirm Send Button */}
              <button
                id="btn-confirm-send-location"
                type="button"
                onClick={() => handleConfirmSend(selectedPlace)}
                className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <Send size={13} />
                <span>發送此 Google Maps 地點到聊天室</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <div className="relative mb-2 flex-shrink-0">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-apple-gray-400">
            {isSearching ? <Loader2 size={16} className="animate-spin text-emerald-600" /> : <Search size={16} />}
          </div>
          <input
            id="input-gmp-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋地標、餐廳、景點 (如: 台北 101, 東京鐵塔)..."
            className="w-full h-10 pl-9 pr-9 bg-apple-gray-100 rounded-2xl text-xs font-medium text-apple-gray-900 placeholder:text-apple-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30 border border-transparent focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-2.5 flex items-center text-apple-gray-400 hover:text-apple-gray-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Pills: Current GPS location & Category shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2 flex-shrink-0">
          <button
            id="btn-gps-current-location"
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200/80 transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
          >
            {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} className="fill-emerald-700" />}
            <span>{isLocating ? '定位中...' : '📍 我的目前位置'}</span>
          </button>

          {[
            { label: '🏢 地標景點', query: '地標景點' },
            { label: '🍜 當地美食', query: '美食餐廳' },
            { label: '🛍️ 購物商圈', query: '購物中心' },
            { label: '🚉 交通站點', query: '捷運站 火車站' },
            { label: '🏨 精選飯店', query: '飯店住宿' }
          ].map((cat, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSearchQuery(cat.query)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200 transition-all cursor-pointer flex-shrink-0"
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-3 pr-0.5 no-scrollbar min-h-[140px] max-h-[260px]">
          <div className="flex items-center justify-between text-[11px] font-bold text-apple-gray-400 mb-1 px-1">
            <span>
              {searchQuery.trim()
                ? `🔍 Google Maps 即時搜尋結果 (${displayedList.length})`
                : `🔥 熱門精選地標 (${displayedList.length})`}
            </span>
            <span className="text-emerald-600 text-[10px]">點擊預覽與發送</span>
          </div>

          {displayedList.length === 0 ? (
            <div className="py-8 text-center text-apple-gray-400 text-xs">
              {isSearching ? '正在透過 Google Maps 搜尋地點...' : '未找到符合的地點，您可以於下方自訂地點'}
            </div>
          ) : (
            displayedList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                className="p-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#F0FDF4] border border-apple-gray-100 hover:border-emerald-300 transition-all text-xs flex items-center justify-between gap-2 group cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-apple-gray-900 group-hover:text-emerald-700 transition-colors leading-tight">
                      📍 {item.name}
                    </span>
                    {item.rating && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                        <Star size={9} className="fill-amber-500 text-amber-500" />
                        {item.rating.toFixed(1)}
                      </span>
                    )}
                    {item.categoryLabel && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
                        {item.categoryLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-apple-gray-400 mt-0.5 truncate">
                    {item.address}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmSend(item);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs active:scale-95 flex-shrink-0 transition-transform cursor-pointer flex items-center gap-1"
                >
                  <span>發送</span>
                  <Send size={10} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Custom Location Fallback */}
        <div className="border-t border-apple-gray-100 pt-2.5 space-y-2 flex-shrink-0">
          <div className="text-[11px] font-bold text-apple-gray-400">手動輸入自訂地點名稱與地址：</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              id="input-custom-location-name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="自訂名稱 (如: 飯店大廳)"
              className="w-full h-8.5 bg-apple-gray-50 rounded-xl px-2.5 text-xs focus:outline-none focus:bg-white border border-apple-gray-200 focus:border-emerald-500"
            />
            <input
              id="input-custom-location-addr"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder="詳細地址 (選填)"
              className="w-full h-8.5 bg-apple-gray-50 rounded-xl px-2.5 text-xs focus:outline-none focus:bg-white border border-apple-gray-200 focus:border-emerald-500"
            />
          </div>
          <button
            id="btn-send-custom-location"
            type="button"
            onClick={() => {
              if (customName.trim()) {
                handleConfirmSend({
                  id: `custom_${Date.now()}`,
                  name: customName.trim(),
                  address: customAddress.trim() || customName.trim(),
                  googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${customName.trim()} ${customAddress.trim()}`.trim())}`
                });
                setCustomName('');
                setCustomAddress('');
              }
            }}
            disabled={!customName.trim()}
            className="w-full h-9 rounded-xl bg-apple-gray-800 text-white font-bold text-xs hover:bg-black disabled:opacity-40 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>發送自訂地點卡片</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
