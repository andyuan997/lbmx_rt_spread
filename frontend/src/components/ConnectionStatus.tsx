import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-profit' : 'bg-loss'} ${
        isConnected ? 'animate-pulse' : ''
      }`}></div>
      <span className={`text-sm ${isConnected ? 'text-profit' : 'text-loss'}`}>
        {isConnected ? '已連接' : '連接中斷'}
      </span>
    </div>
  );
};

export default ConnectionStatus;
