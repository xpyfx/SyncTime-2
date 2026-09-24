import React from 'react';
import {
  MapPin,
  ExternalLink
} from 'lucide-react';
import { LocationData } from '../types';

interface GoogleMapsLocationCardProps {
  location: LocationData;
  msgTime?: string;
  isMe?: boolean;
}

export const GoogleMapsLocationCard: React.FC<
  GoogleMapsLocationCardProps
> = ({
  location,
  msgTime
}) => {
  const query =
    location.query ||
    `${location.name} ${location.address || ''}`.trim();

  const mapsUrl =
    location.googleMapsUri ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;

  const handleOpenMaps = () => {
    window.open(
      mapsUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      id={`location-card-${location.id}`}
      className="
        w-[270px]
        sm:w-[300px]
        bg-[#F0FDF4]
        rounded-[20px]
        p-3.5
        border border-emerald-200/80
        shadow-apple-xs
        text-left
      "
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="
            flex items-center gap-1.5
            text-emerald-800
            font-bold
            text-[11px]
          "
        >
          <MapPin
            size={14}
            className="text-emerald-600"
          />

          <span>分享地點</span>
        </div>

        {msgTime && (
          <span className="text-[10px] text-emerald-700">
            {msgTime}
          </span>
        )}
      </div>

      <div className="font-bold text-[15px] text-apple-gray-900 leading-snug">
        {location.name}
      </div>

      {location.address && (
        <div className="text-[11px] text-apple-gray-500 mt-1">
          {location.address}
        </div>
      )}

      <button
        type="button"
        onClick={handleOpenMaps}
        className="
          w-full
          mt-3
          h-10
          rounded-xl
          bg-emerald-600
          hover:bg-emerald-700
          text-white
          text-xs
          font-bold
          flex items-center justify-center gap-1.5
          active:scale-[0.98]
          transition-all
        "
      >
        <span>在 Google Maps 查看</span>
        <ExternalLink size={13} />
      </button>
    </div>
  );
};