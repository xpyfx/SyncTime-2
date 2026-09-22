import React from 'react';
import { MapPin, Star, ExternalLink, Navigation } from 'lucide-react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { LocationData } from '../types';

interface GoogleMapsLocationCardProps {
  location: LocationData;
  msgTime?: string;
  isMe?: boolean;
}

export const GoogleMapsLocationCard: React.FC<GoogleMapsLocationCardProps> = ({
  location,
  msgTime,
  isMe = false
}) => {
  const queryStr = location.query || `${location.name} ${location.address || ''}`.trim();
  const mapsUrl = location.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(queryStr)}`;

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  };

  const hasCoords = typeof location.lat === 'number' && typeof location.lng === 'number' && !isNaN(location.lat) && !isNaN(location.lng);

  return (
    <div
      id={`location-card-${location.id}`}
      className="w-[280px] sm:w-[320px] bg-[#F0FDF4] rounded-[20px] p-3.5 border border-emerald-200/80 shadow-apple-xs font-sans text-left flex flex-col relative overflow-hidden transition-all hover:border-emerald-300"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] bg-white/95 px-2.5 py-1 rounded-full border border-emerald-200/60 shadow-2xs">
          <MapPin size={13} className="text-emerald-600 stroke-[2.5]" />
          <span>Google Maps 地點</span>
        </div>
        {msgTime && <span className="text-[10px] text-emerald-700 font-medium">{msgTime}</span>}
      </div>

      {/* Place Title & Rating */}
      <div className="my-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="font-extrabold text-[15px] text-apple-gray-900 leading-snug break-words">
            {location.name}
          </h4>
          {location.rating && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/50">
              <Star size={9} className="fill-amber-500 text-amber-500" />
              {location.rating.toFixed(1)}
              {location.userRatingCount && (
                <span className="text-apple-gray-400 text-[9px]">
                  ({location.userRatingCount > 1000 ? `${(location.userRatingCount / 1000).toFixed(0)}k` : location.userRatingCount})
                </span>
              )}
            </span>
          )}
        </div>
        {location.address && (
          <p className="text-[11px] text-apple-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
            {location.address}
          </p>
        )}
      </div>

      {/* Live Google Map mini preview if coordinates are available */}
      {hasCoords && (
        <div 
          onClick={handleOpenMaps} 
          className="w-full h-28 rounded-xl overflow-hidden my-2 relative border border-emerald-200 shadow-2xs cursor-pointer group"
          title="點擊於 Google Maps 中開啟"
        >
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat: location.lat!, lng: location.lng! }}
            center={{ lat: location.lat!, lng: location.lng! }}
            defaultZoom={14}
            disableDefaultUI={true}
            gestureHandling="none"
            className="w-full h-full pointer-events-none group-hover:scale-105 transition-transform duration-300"
          >
            <AdvancedMarker position={{ lat: location.lat!, lng: location.lng! }}>
              <Pin background="#10B981" borderColor="#065F46" glyphColor="#FFFFFF" scale={0.85} />
            </AdvancedMarker>
          </Map>
          <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <span>放大檢視</span>
            <ExternalLink size={8} />
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleOpenMaps}
          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs active:scale-95 cursor-pointer"
        >
          <span>Google 地圖</span>
          <ExternalLink size={11} />
        </button>
        <button
          type="button"
          onClick={handleOpenDirections}
          className="py-1.5 px-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer"
          title="開啟路線導航"
        >
          <Navigation size={11} className="fill-emerald-700" />
          <span>導航</span>
        </button>
      </div>
    </div>
  );
};
