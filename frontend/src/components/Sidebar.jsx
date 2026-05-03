import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const fullName = localStorage.getItem('full_name');

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/');
  };

  const navItem = (label, path) => (
    <div
      onClick={() => {
        navigate(path);
        if (window.innerWidth < 768 && onClose) onClose();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        cursor: 'pointer',
        borderRadius: 10,
        background: location.pathname === path ? '#e8e4dc' : 'transparent',
        color: '#1a1a1a',
        fontSize: 14,
        fontWeight: location.pathname === path ? 600 : 400,
        marginBottom: 4,
        transition: 'background 0.2s',
      }}
    >
      {label}
    </div>
  );

  return (
    <>
      {open && window.innerWidth < 768 && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 260,
          background: '#ffffff',
          borderRight: '1px solid #e8e4dc',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          zIndex: 100,
          padding: '20px 12px',
          boxShadow: open ? '4px 0 20px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 8px 28px',
          }}
        >
          <img
  src={require('../assets/palayguard_logo.jpg')}
  alt="PalayGuard Logo"
  style={{
    width: 34,
    height: 34,
    objectFit: 'contain',
    borderRadius: '50%',
  }}
/>
<span style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a' }}>
  PalayGuard
</span>
        </div>

        <div style={{ flex: 1 }}>
  {navItem('Dashboard', '/dashboard')}
  {navItem('Alerts', '/alerts')}
  {role === 'admin' && navItem('Admin Panel', '/admin')}
</div>
        <div style={{ borderTop: '1px solid #e8e4dc', paddingTop: 16 }}>
          {fullName && (
            <div
              style={{
                padding: '4px 20px 12px',
                fontSize: 12,
                color: '#888',
              }}
            >
              {role === 'admin' ? 'Admin' : 'Farmer'} — {fullName}
            </div>
          )}
          <div
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 20px',
              cursor: 'pointer',
              color: '#888',
              fontSize: 14,
              borderRadius: 10,
              transition: 'background 0.2s',
            }}
          >
            Sign Out
          </div>
        </div>
      </div>
    </>
  );
}