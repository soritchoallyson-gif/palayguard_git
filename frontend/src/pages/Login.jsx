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
        filter: 'brightness(0.8)',
        zIndex: 0,
      }} />

      {/* Navbar */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.92)',
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
        <span style={{ fontWeight: 700, fontSize: 17 }}>PalayGuard</span>
      </div>

      {/* Login Card */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: 'rgba(220,230,210,0.88)',
          backdropFilter: 'blur(12px)',
          borderRadius: 20, padding: '40px 32px',
          width: '100%', maxWidth: 400,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>

          {/* Big Logo */}
          <img
            src={require('../assets/palayguard_logo.jpg')}
            alt="PalayGuard Logo"
            style={{
              width: 100, height: 100,
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
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                color: '#444', display: 'block', marginBottom: 8,
              }}>USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: '100%', padding: '13px 18px',
                  borderRadius: 28, border: 'none',
                  background: '#ffffff', fontSize: 14,
                  outline: 'none', color: '#1a1a1a',
                }}
              />
            </div>

            <div>
              <label style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                color: '#444', display: 'block', marginBottom: 8,
              }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%', padding: '13px 18px',
                  borderRadius: 28, border: 'none',
                  background: '#ffffff', fontSize: 14,
                  outline: 'none', color: '#1a1a1a',
                }}
              />
            </div>

            {error && (
              <p style={{
                color: '#c0392b', fontSize: 13,
                textAlign: 'center', fontWeight: 500,
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px', borderRadius: 28,
                background: '#3d1f1f', color: '#fff',
                border: 'none', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, opacity: loading ? 0.8 : 1,
                transition: 'opacity 0.2s',
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