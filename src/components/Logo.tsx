import React from 'react';

export const Logo = ({ className = "h-8" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 font-black text-2xl tracking-tighter ${className}`}>
      <div className="w-10 h-10 flex-shrink-0 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full fill-accent">
          <g transform="scale(0.85)" className="origin-center">
            {/* Background layer for depth */}
            <path 
              d="M38,12 C22,12 18,35 18,60 C18,85 35,95 58,95 C82,95 95,80 95,60 C95,42 75,48 60,32 C50,20 48,12 38,12 Z" 
              opacity="0.3" 
              transform="translate(4, 4) rotate(5, 50, 50)"
            />
            {/* Main logo layer */}
            <path d="M38,12 C22,12 18,35 18,60 C18,85 35,95 58,95 C82,95 95,80 95,60 C95,42 75,48 60,32 C50,20 48,12 38,12 Z" />
          </g>
        </svg>
      </div>
      <span className="dark:text-white text-primary uppercase">beehive</span>
    </div>
  );
};
