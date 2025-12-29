import { useState } from 'react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

export const Avatar = ({ 
  src, 
  name, 
  size = 'md',
  className 
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'h-5 w-5 text-[10px]',
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
    xl: 'h-12 w-12 text-lg',
  };

  const initials = getInitials(name);
  const showImage = src && !imageError;
  const bgColor = getAvatarColor(initials);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 overflow-hidden',
        sizeClasses[size],
        bgColor,
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

