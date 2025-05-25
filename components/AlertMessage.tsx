
import React from 'react';

interface AlertMessageProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  className?: string;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ type, message, className }) => {
  const baseClasses = "p-4 rounded-md shadow-md text-[var(--gs-tide-white)]"; // Ensure text is readable
  let typeClasses = "";

  switch (type) {
    case 'error':
      // GS Lava for error states
      typeClasses = "bg-[var(--gs-lava)] border border-[var(--gs-lava-darker)]";
      break;
    case 'success':
      // Using GS Mint for success, can be adjusted
      typeClasses = "bg-[var(--gs-mint)] border border-[var(--gs-mint-darker)]";
      break;
    case 'warning':
      // A generic warning color, could be defined in palette if needed
      typeClasses = "bg-yellow-500 border border-yellow-700"; 
      break;
    case 'info':
    default:
      // A generic info color, could be defined in palette
      typeClasses = "bg-blue-500 border border-blue-700"; 
      break;
  }

  return (
    <div className={`${baseClasses} ${typeClasses} ${className || ''}`} role="alert">
      <p className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default AlertMessage;
