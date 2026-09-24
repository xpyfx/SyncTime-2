import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Search,
  X,
  Send,
  ExternalLink
} from 'lucide-react';
import { LocationData } from '../types';

interface GoogleMapsLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (location: LocationData) => void;
}

export const GoogleMapsLocationModal: React.FC<GoogleMapsLocationModalProps> = ({
  isOpen,
  onClose,
  onSendLocation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState('');

  if (!isOpen) return null;

  const buildGoogleMapsUrl = (query: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;
  };

  const handleSearch = () => {
    const query = searchQuery.trim();

    if (!query) return;

    setSelectedQuery(query);
  };

  const handleSend = () => {
    const query = (selectedQuery || searchQuery).trim();

    if (!query) return;

    const location: LocationData = {
      id: `loc_${Date.now()}`,
      name: query,
      query,
      googleMapsUri: buildGoogleMapsUrl(query),
      createdAt: new Date().toISOString()
    };

    onSendLocation(location);

    setSearchQuery('');
    setSelectedQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedQuery('');
    onClose();
  };

  const mapsUrl = selectedQuery
    ? buildGoogleMapsUrl(selectedQuery)
    : '';

  return (
    <div
      className="
        fixed inset-0 z-[120]
        flex items-center justify-center
        p-4
        bg-black/50 backdrop-blur-xs
      "
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="
          bg-white
          rounded-3xl
          max-w-sm
          w-full
          p-5
          shadow-2xl
          border border-apple-gray-100
        "
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="
                w-9 h-9
                rounded-full
                bg-emerald-500/10
                flex items-center justify-center
                text-emerald-600
              "
            >
              <MapPin size={19} />
            </div>

            <div>
              <h3 className="font-bold text-apple-gray-900 text-base">
                分享地點
              </h3>

              <p className="text-[11px] text-apple-gray-400 mt-0.5">
                輸入地點名稱並分享至聊天室
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="
              w-8 h-8
              rounded-full
              bg-apple-gray-100
              flex items-center justify-center
              text-apple-gray-500
            "
          >
            <X size={17} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-2"
        >
          <div
            className="
              flex-1
              flex items-center gap-2
              bg-apple-gray-50
              border border-apple-gray-200
              rounded-2xl
              px-3.5
              h-11
            "
          >
            <Search
              size={16}
              className="text-apple-gray-400 shrink-0"
            />

            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);

                if (selectedQuery) {
                  setSelectedQuery('');
                }
              }}
              placeholder="搜尋地點，例如：台北 101"
              className="
                flex-1
                bg-transparent
                outline-none
                text-sm
                text-apple-gray-900
                placeholder:text-apple-gray-400
              "
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="
              h-11
              px-4
              rounded-2xl
              bg-emerald-600
              text-white
              text-xs
              font-bold
              disabled:opacity-40
            "
          >
            搜尋
          </button>
        </form>

        {selectedQuery && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="
              mt-4
              p-4
              rounded-2xl
              bg-emerald-50
              border border-emerald-200
            "
          >
            <div className="flex items-start gap-2.5">
              <MapPin
                size={18}
                className="text-emerald-600 mt-0.5 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-apple-gray-900">
                  {selectedQuery}
                </div>

                <div className="text-[11px] text-apple-gray-500 mt-1">
                  傳送後，聊天室成員可直接前往 Google Maps 查看詳細資訊。
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex-1
                  h-10
                  rounded-xl
                  bg-white
                  border border-emerald-200
                  text-emerald-700
                  text-xs
                  font-bold
                  flex items-center justify-center gap-1.5
                "
              >
                <ExternalLink size={14} />
                Google Maps 查看
              </a>

              <button
                type="button"
                onClick={handleSend}
                className="
                  flex-1
                  h-10
                  rounded-xl
                  bg-emerald-600
                  text-white
                  text-xs
                  font-bold
                  flex items-center justify-center gap-1.5
                "
              >
                <Send size={14} />
                發送
              </button>
            </div>
          </motion.div>
        )}

        {!selectedQuery && (
          <p className="mt-4 text-[10px] text-center text-apple-gray-400">
            不需在 App 內載入 Google 地圖，詳細地點資訊將於 Google Maps 查看
          </p>
        )}
      </motion.div>
    </div>
  );
};