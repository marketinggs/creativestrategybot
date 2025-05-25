
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center my-8 p-4 bg-[var(--gs-dark-grey-6)] rounded-lg shadow">
      <div className="relative w-32 h-32">
        {/* Paper */}
        <div className="absolute bottom-0 left-0 w-24 h-28 bg-[var(--gs-off-white)] rounded-sm shadow-lg transform rotate-3">
          {/* Paper lines */}
          <div className="absolute top-6 left-3 right-3 space-y-2">
            <div className="h-0.5 bg-[var(--gs-slate)] animate-line-1"></div>
            <div className="h-0.5 bg-[var(--gs-slate)] animate-line-2"></div>
            <div className="h-0.5 bg-[var(--gs-slate)] animate-line-3"></div>
            <div className="h-0.5 bg-[var(--gs-slate)] w-1/2 animate-line-4"></div>
          </div>
        </div>
        
        {/* Pen */}
        <div className="absolute top-4 right-0 w-20 h-20 animate-pen">
          {/* Pen body */}
          <div className="absolute transform rotate-45 origin-bottom-left">
            <div className="relative">
              {/* Pen shaft */}
              <div className="w-2 h-16 bg-gradient-to-b from-[var(--gs-mint)] to-[var(--gs-mint-darker)] rounded-t-sm"></div>
              {/* Pen tip */}
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-[var(--gs-black-pearl)] -mt-0.5"></div>
              {/* Pen cap */}
              <div className="absolute top-0 w-2 h-3 bg-[var(--gs-bottle-green)] rounded-t-sm"></div>
              {/* Pen clip */}
              <div className="absolute top-0 -right-0.5 w-0.5 h-4 bg-[var(--gs-slate)]"></div>
            </div>
          </div>
          
          {/* Writing effect - small dots/lines */}
          <div className="absolute bottom-8 left-8 animate-write">
            <div className="w-8 h-0.5 bg-[var(--gs-mint)] opacity-0"></div>
          </div>
        </div>
        
        {/* Sparkles/Stars for creative effect */}
        <div className="absolute top-0 left-0 animate-sparkle-1">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-[var(--gs-mint)]">
            <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute top-8 right-2 animate-sparkle-2">
          <svg width="12" height="12" viewBox="0 0 16 16" className="text-[var(--gs-mint)] opacity-80">
            <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute bottom-2 right-8 animate-sparkle-3">
          <svg width="10" height="10" viewBox="0 0 16 16" className="text-[var(--gs-off-white)] opacity-70">
            <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="currentColor" />
          </svg>
        </div>
      </div>
      
      {/* Loading Text */}
      <div className="mt-4 text-lg font-semibold text-[var(--gs-off-white)]">
        {message || "Crafting your masterpiece..."}<span className="animate-dots"></span>
      </div>
      
      {/* Fix: Cast the 'jsx' prop to satisfy TypeScript when styled-jsx types are not automatically picked up.
          This preserves the intended styled-jsx behavior for scoped CSS. */}
      <style {...{jsx: true}}>{`
        @keyframes pen {
          0%, 100% {
            transform: translateX(0) translateY(0) rotate(-15deg);
          }
          25% {
            transform: translateX(-8px) translateY(8px) rotate(-20deg);
          }
          50% {
            transform: translateX(-12px) translateY(12px) rotate(-25deg);
          }
          75% {
            transform: translateX(-8px) translateY(8px) rotate(-20deg);
          }
        }
        
        @keyframes write {
          0%, 100% {
            opacity: 0;
            transform: scaleX(0);
          }
          50% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        
        @keyframes line1 {
          0% { width: 0; }
          100% { width: 100%; }
        }
        
        @keyframes line2 {
          0% { width: 0; }
          100% { width: 100%; }
        }
        
        @keyframes line3 {
          0% { width: 0; }
          100% { width: 100%; }
        }
        
        @keyframes line4 {
          0% { width: 0; }
          100% { width: 50%; }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }
        
        .animate-pen {
          animation: pen 2s ease-in-out infinite;
        }
        
        .animate-write {
          animation: write 2s ease-in-out infinite;
        }
        
        .animate-line-1 {
          animation: line1 2s ease-out infinite;
        }
        
        .animate-line-2 {
          animation: line2 2s ease-out infinite 0.2s;
        }
        
        .animate-line-3 {
          animation: line3 2s ease-out infinite 0.4s;
        }
        
        .animate-line-4 {
          animation: line4 2s ease-out infinite 0.6s;
        }
        
        .animate-sparkle-1 {
          animation: sparkle 2s ease-in-out infinite;
        }
        
        .animate-sparkle-2 {
          animation: sparkle 2s ease-in-out infinite 0.6s;
        }
        
        .animate-sparkle-3 {
          animation: sparkle 2s ease-in-out infinite 1.2s;
        }
        
        .animate-dots::after {
          content: '.';
          animation: dots 1.5s steps(3, end) infinite;
        }
                
        @keyframes dots {
          0%, 25% { content: '.'; }
          50% { content: '..'; }
          75%, 100% { content: '...'; }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
