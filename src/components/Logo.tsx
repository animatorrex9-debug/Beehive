import React from 'react';

export const Logo = ({ className = "h-8" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 font-black text-2xl tracking-tighter ${className}`}>
      <div className="bg-accent text-white w-8 h-8 rounded-lg flex items-center justify-center">
        $
      </div>
      <span className="dark:text-white text-primary uppercase">beehive</span>
    </div>
  );
};
