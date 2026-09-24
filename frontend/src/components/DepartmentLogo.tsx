import React from 'react';

interface DepartmentLogoProps {
  type: 'booshnam' | 'globe';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DepartmentLogo: React.FC<DepartmentLogoProps> = ({
  type,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[7px]',
    md: 'w-9 h-9 text-[8px]',
    lg: 'w-11 h-11 text-[9px]'
  };

  if (type === 'globe') {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full shrink-0 flex items-center justify-center relative overflow-hidden shadow-xs ring-1 ring-emerald-200 select-none ${className}`}
        style={{ backgroundColor: '#54b948' }}
        title="Department Logo"
      >
        <svg 
          viewBox="0 0 40 40" 
          className="w-full h-full"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base Globe Green */}
          <circle cx="20" cy="20" r="20" fill="#4fae44" />
          
          {/* Continents / Terrain Shapes matching the screenshot */}
          <path 
            d="M6 14C8 10 12 8 16 9C19 10 18 14 16 16C13 18 10 19 8 23C7 25 5 27 4 25C3 21 4 17 6 14Z" 
            fill="#3b8d34" 
          />
          <path 
            d="M22 6C26 6 30 9 33 12C31 15 28 14 26 13C23 12 21 9 22 6Z" 
            fill="#3b8d34" 
          />
          <path 
            d="M19 18C23 16 28 19 32 23C30 26 26 28 23 27C20 26 18 22 19 18Z" 
            fill="#3b8d34" 
          />
          <path 
            d="M12 28C16 26 20 29 22 33C19 35 15 35 12 34C10 32 10 29 12 28Z" 
            fill="#3b8d34" 
          />
          <circle cx="29" cy="30" r="3.5" fill="#3b8d34" />
        </svg>
      </div>
    );
  }

  // Red circle logo with "BOOSHNAM" in white bold text
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-[#e5252a] flex items-center justify-center text-white font-black tracking-tighter shrink-0 shadow-xs uppercase select-none ring-1 ring-red-200 ${className}`}
      title="Booshnam Associates"
    >
      <span className="font-extrabold tracking-tighter scale-90">BOOSHNAM</span>
    </div>
  );
};
