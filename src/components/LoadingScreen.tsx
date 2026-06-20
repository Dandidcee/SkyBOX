import React, { useEffect } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onFinish: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    // Hide loading screen after 2.5 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-welcome type-line-1">Admin Panel</div>
        <div className="loading-brand type-line-2" style={{ fontSize: '2.5rem' }}>
          <span className="text-muted" style={{ fontWeight: 400, fontSize: '1.2rem', marginRight: '8px' }}>by</span>
          Sky<span className="text-green">FlowID</span>
        </div>
        <div className="loading-company type-line-3" style={{ marginTop: '12px' }}>
          made for <span className="text-green" style={{ fontWeight: 600 }}>leyatiOfficial</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
