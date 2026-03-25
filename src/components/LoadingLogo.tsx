import React from 'react';
import { motion } from 'motion/react';

interface LoadingLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingLogo: React.FC<LoadingLogoProps> = ({ size = 'md', className = "" }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  const path = "M38,12 C22,12 18,35 18,60 C18,85 35,95 58,95 C82,95 95,80 95,60 C95,42 75,48 60,32 C50,20 48,12 38,12 Z";

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`${sizeMap[size]} relative`}>
        <motion.svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Outer Spinner Track */}
          <circle
            cx="50"
            cy="50"
            r="48"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            className="text-accent/10"
          />
          
          {/* Rotating Spinner Segment */}
          <motion.circle
            cx="50"
            cy="50"
            r="48"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="80 200"
            fill="none"
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="origin-center text-accent"
          />

          <g transform="scale(0.7)" className="origin-center fill-accent">
            {/* Background layer for depth */}
            <motion.path 
              d={path}
              opacity="0.3" 
              transform="translate(4, 4) rotate(5, 50, 50)"
              animate={{
                opacity: [0.2, 0.4, 0.2],
                transform: [
                  "translate(4, 4) rotate(5, 50, 50)",
                  "translate(6, 6) rotate(8, 50, 50)",
                  "translate(4, 4) rotate(5, 50, 50)"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            {/* Main logo layer */}
            <path d={path} />
          </g>
        </motion.svg>
      </div>
    </div>
  );
};
