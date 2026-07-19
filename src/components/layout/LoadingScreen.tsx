import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { MdLockOutline } from 'react-icons/md';
library.add(fab);

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Use the exact FontAwesomeIcon the user requested
  const waIcon = { prefix: 'fab', iconName: 'whatsapp' } as any;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#111b21',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: '#ffffff'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '72px', color: '#3b4a54', marginBottom: '24px' }}>
          <FontAwesomeIcon icon={waIcon} />
        </div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 500, letterSpacing: '0.5px' }}>Skybox WhatsApp CRM</h2>
        
        <div style={{ width: '280px', height: '4px', backgroundColor: '#2a3942', marginTop: '32px', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${Math.min(progress, 100)}%`, 
            backgroundColor: '#00a884', 
            transition: 'width 0.2s ease-out',
            borderRadius: '4px'
          }} />
        </div>
      </div>

      <div style={{ paddingBottom: '32px', display: 'flex', alignItems: 'center', gap: '6px', color: '#8696a0', fontSize: '13px' }}>
        <MdLockOutline size={16} />
        <span>Terenkripsi secara end-to-end</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
