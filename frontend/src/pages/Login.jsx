import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import riceField from '../assets/ricefield.jpg';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('full_name', res.data.full_name);
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Background Image */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `url(${riceField})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'brightness(0.9) grayscale(0.3)',
        zIndex: 0,
      }} />

      {/* Navbar */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.15)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
      }}>
        <img
          src={require('../assets/palayguard_logo.jpg')}
          alt="PalayGuard Logo"
          style={{
            width: 30, height: 30,
            objectFit: 'contain',
            borderRadius: '50%',
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 17, color: '#ffffff' }}>PalayGuard</span>
      </div>

      {/* Login Card */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: 'rgba(37, 36, 36, 0.6)',
          border: '3px solid rgba(48, 43, 43, 0.73)',
          borderRadius: 20, padding: '50px 40px',
          width: '100%', maxWidth: 480,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>

 
          <img
            src={require('../assets/palayguard_logo.jpg')}
            alt="PalayGuard Logo"
            style={{
              width: 120, height: 120,
              objectFit: 'contain',
              borderRadius: '50%',
            }}
          />

          {/* Form */}
          <form
            onSubmit={handleLogin}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <label style={{
                fontSize: 14, fontWeight: 700, letterSpacing: 1,
                color: '#ffffff', display: 'block', marginBottom: 8,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: '100%', padding: '13px 18px',
                  borderRadius: 28,
                  background: '#ffffff',
                  color: '#1a1a1a',
                  border: '2px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{
                fontSize: 14, fontWeight: 700, letterSpacing: 1,
                color: '#ffffff', display: 'block', marginBottom: 8,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%', padding: '13px 18px',
                  borderRadius: 28,
                  background: '#ffffff',
                  color: '#1a1a1a',
                  border: '2px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{
                color: '#ffcccc', fontSize: 13,
                textAlign: 'center', fontWeight: 500,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px', borderRadius: 28,
                background: 'rgba(61, 31, 31, 0.9)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, opacity: loading ? 0.8 : 1,
                transition: 'opacity 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}