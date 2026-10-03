import React from 'react';

interface DepartmentLogoProps {
  type?: 'booshnam' | 'globe';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DepartmentLogo: React.FC<DepartmentLogoProps> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <img 
      src="/booshnam-app-icon.png" 
      alt="Booshnam Associates" 
      className={`${sizeClasses[size]} object-contain shrink-0 ${className}`}
      title="Booshnam Associates"
    />
  );
};
