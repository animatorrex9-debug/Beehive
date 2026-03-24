import React from 'react';

export const Logo = ({ className = "h-8" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 font-black text-2xl tracking-tighter ${className}`}>
      <div className="w-10 h-10 flex-shrink-0 relative">
        <img 
          src="https://storage.googleapis.com/test-media-be/f8f9f0f1-f2f3-f4f5-f6f7-f8f9f0f1f2f3/logo.png" 
          className="w-full h-full object-contain relative z-10"
          style={{ 
            // This filter turns any color (including black) into the accent green (#22C55E)
            filter: 'brightness(0) saturate(100%) invert(62%) sepia(91%) saturate(384%) hue-rotate(86%) brightness(96%) contrast(91%)'
          }}
          alt="Beehive Logo"
          referrerPolicy="no-referrer"
        />
      </div>
      <span className="dark:text-white text-primary uppercase">beehive</span>
    </div>
  );
};
