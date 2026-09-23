import React from 'react';

interface PhoneAuthIllustrationProps {
  className?: string;
  size?: number;
}

export const PhoneAuthIllustration: React.FC<PhoneAuthIllustrationProps> = ({ 
  className = '', 
  size = 175 
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg 
        viewBox="0 0 200 200" 
        width={size} 
        height={size} 
        className="block drop-shadow-sm transition-transform duration-300 hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="circleMaskClip">
            <circle cx="100" cy="100" r="82" />
          </clipPath>
          <linearGradient id="phoneScreenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>
          <filter id="subtleBubbleShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e3a8a" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Soft Pastel Blue Circular Background */}
        <circle cx="100" cy="100" r="82" fill="#EAF3FD" />

        {/* Clipped Container for Hands and Phone extending outside circle */}
        <g clipPath="url(#circleMaskClip)">
          
          {/* Smartphone Body */}
          <rect 
            x="74" 
            y="38" 
            width="52" 
            height="98" 
            rx="8" 
            fill="url(#phoneScreenGrad)" 
            stroke="#3B82F6" 
            strokeWidth="2.5" 
          />
          
          {/* Speaker Slit / Top Notch */}
          <line 
            x1="93" 
            y1="45" 
            x2="107" 
            y2="45" 
            stroke="#3B82F6" 
            strokeWidth="2" 
            strokeLinecap="round" 
          />

          {/* Left Hand & Arm (from bottom left) */}
          <path 
            d="M 32,200 C 40,165 52,142 66,132 C 74,127 82,130 87,140 C 93,150 91,162 84,175 C 78,188 72,196 66,200 Z" 
            fill="#FFAF74" 
          />
          
          {/* Left Thumb resting on lower left phone corner */}
          <path 
            d="M 68,132 C 73,123 82,122 89,126 C 94,130 96,138 91,145 C 84,142 75,138 68,132 Z" 
            fill="#FFAF74" 
            stroke="#F58F49" 
            strokeWidth="1" 
          />

          {/* Left Index Finger pointing up and touching the screen */}
          <path 
            d="M 85,138 C 88,120 95,102 101,84 C 103,79 107,77 111,77 C 115,77 118,81 116,86 C 112,100 106,116 102,135 Z" 
            fill="#FFAF74" 
            stroke="#F58F49" 
            strokeWidth="1.2" 
          />

          {/* Right Hand & Arm (from bottom right) */}
          <path 
            d="M 124,142 C 132,135 142,132 153,142 C 162,152 165,174 172,200 L 126,200 C 122,185 119,162 124,142 Z" 
            fill="#FFAF74" 
          />
          
          {/* Right Fingers wrapping over the right edge */}
          {/* Top Finger */}
          <path 
            d="M 125,76 C 129,76 133,78 134,82 C 135,86 133,90 129,91 L 125,91 Z" 
            fill="#FFAF74" 
            stroke="#F58F49" 
            strokeWidth="1" 
          />
          {/* Middle Finger 1 */}
          <path 
            d="M 125,93 C 129,93 133,95 134,99 C 135,103 133,107 129,108 L 125,108 Z" 
            fill="#FFAF74" 
            stroke="#F58F49" 
            strokeWidth="1" 
          />
          {/* Middle Finger 2 */}
          <path 
            d="M 125,110 C 129,110 133,112 134,116 C 135,120 133,124 128,125 L 125,125 Z" 
            fill="#FFAF74" 
            stroke="#F58F49" 
            strokeWidth="1" 
          />

          {/* Blue Speech/Message Bubble with "908....." (Picture 2) */}
          <g filter="url(#subtleBubbleShadow)">
            <rect 
              x="42" 
              y="52" 
              width="64" 
              height="29" 
              rx="8" 
              fill="#3B66F5" 
            />
            <text 
              x="74" 
              y="71" 
              fill="#FFFFFF" 
              fontSize="12.5" 
              fontWeight="bold" 
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
              textAnchor="middle" 
              letterSpacing="1"
            >
              908.....
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};
