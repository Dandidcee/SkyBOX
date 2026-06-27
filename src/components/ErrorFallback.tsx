import React from 'react';
import { FallbackProps } from 'react-error-boundary';

export const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--color-background, #f5f5f5)',
      color: 'var(--color-text, #333)',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface, #fff)',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h2 style={{ color: 'var(--color-error, #ef4444)', marginBottom: '16px' }}>Oops! Terjadi Kesalahan</h2>
        <p style={{ marginBottom: '24px', color: 'var(--color-text-secondary, #666)' }}>
          Komponen ini mengalami masalah saat dimuat.
        </p>
        
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '13px',
          fontFamily: 'monospace',
          overflowX: 'auto',
          textAlign: 'left'
        }}>
          {error.message}
        </div>

        <button
          onClick={resetErrorBoundary}
          style={{
            backgroundColor: 'var(--color-primary, #3b82f6)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          Muat Ulang Halaman
        </button>
      </div>
    </div>
  );
};
