import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-[#0B0E14] text-slate-300 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Dumbbell className="h-8 w-8 text-[#FF4D1C] mb-2" aria-hidden="true" />
        {fallbackTitle && (
          <span className="font-display text-base font-bold tracking-wide text-center text-white">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
