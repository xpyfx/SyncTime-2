import React from 'react';

interface CrystalBubbleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const CrystalBubbleButton: React.FC<CrystalBubbleButtonProps> = ({
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-11 h-11'
  }[size];

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer shrink-0 group select-none
        ${sizeClasses}
        ${
          disabled
            ? 'opacity-40 cursor-not-allowed filter grayscale-[30%]'
            : 'hover:scale-105 active:scale-95'
        }
        ${className}`}
      style={{
        boxShadow: disabled
          ? 'none'
          : '0 4px 16px -2px rgba(56, 189, 248, 0.42), 0 2px 6px rgba(0, 0, 0, 0.08)'
      }}
      {...props}
    >
      {isLoading ? (
        <div className="w-full h-full rounded-full bg-gradient-to-b from-[#62c9fc] to-[#38bdf8] flex items-center justify-center p-1 border border-white/80">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <svg
          viewBox="0 0 44 44"
          className="w-full h-full drop-shadow-2xs overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft luminous radial glow: cyan core fading outward */}
            <radialGradient
              id="crystalGlowGrad"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <stop offset="0%" stopColor="#43bbf6" />
              <stop offset="32%" stopColor="#62c9fc" />
              <stop offset="64%" stopColor="#9fe2fd" />
              <stop offset="86%" stopColor="#d3f2fe" />
              <stop offset="100%" stopColor="#89d7f7" />
            </radialGradient>

            {/* Outer delicate glass stroke */}
            <linearGradient id="crystalOuterStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84d0ee" />
              <stop offset="50%" stopColor="#60c3ea" />
              <stop offset="100%" stopColor="#84d0ee" />
            </linearGradient>

            {/* Specular inner glass rim reflection */}
            <linearGradient id="crystalInnerRim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#d8f3fd" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
            </linearGradient>

            {/* Arrow drop shadow for tactile depth */}
            <filter id="crystalArrowShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="0.8"
                floodColor="#0284c7"
                floodOpacity="0.38"
              />
            </filter>
          </defs>

          {/* Main Crystal Bubble Body */}
          <circle
            cx="22"
            cy="22"
            r="21"
            fill="url(#crystalGlowGrad)"
          />

          {/* Outer Glass Rim */}
          <circle
            cx="22"
            cy="22"
            r="21"
            stroke="url(#crystalOuterStroke)"
            strokeWidth="1.2"
          />

          {/* Inner Specular Highlight Ring */}
          <circle
            cx="22"
            cy="22"
            r="19.8"
            stroke="url(#crystalInnerRim)"
            strokeWidth="1.1"
          />

          {/* Apple-style Crisp White Up Arrow with rounded joints */}
          <g filter="url(#crystalArrowShadow)">
            <path
              d="M22 30.5V13.5M22 13.5L15.2 20.3M22 13.5L28.8 20.3"
              stroke="#FFFFFF"
              strokeWidth="2.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:-translate-y-0.5"
            />
          </g>
        </svg>
      )}
    </button>
  );
};
