import { useState } from 'react';
import { cn } from '@/lib/utils';

export const Avatar = ({ 
  src, 
  name, 
  size = 'md',
  className 
}) => {
  const [imageError, setImageError] = useState(false);

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    // Get first letter of first and last name
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeClasses = {
    xs: 'h-5 w-5 text-[10px]',
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
    xl: 'h-12 w-12 text-lg',
  };

  const initials = getInitials(name);
  const showImage = src && !imageError;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white bg-indigo-600 flex-shrink-0 overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

