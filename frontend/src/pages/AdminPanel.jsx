import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import API from '../api';

const isMobile = () => window.innerWidth < 768;

export default function AdminPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const [users, setUsers] = useState([]);
  const [threshold, setThreshold] = useState(40);
  const [newThreshold, setNewThreshold] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', full_name: '', role: 'farmer', contact_number: '', location: '' });
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  const fetchUsers = async () => {
    try {
      const res = await API.get('/auth/users');
      setUsers(res.data);
    } catch {}
  };

  const fetchThreshold = async () => {
    try {
      const res = await API.get('/sensors/threshold');
      setThreshold(res.data.threshold);
      setNewThreshold(res.data.threshold);
    } catch {}
  };

  useEffect(() => {
    fetchUsers();
    fetchThreshold();
  }, []);

  const handleUpdateThreshold = async () => {
    try {
      await API.post('/sensors/threshold', { threshold: parseFloat(newThreshold) });
      setThreshold(parseFloat(newThreshold));
      setMessage('✅ Threshold updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Failed to update threshold');
    }
  };

  const handleCreateUser = async () => {
    try {
      await API.post('/auth/register', newUser);
      setMessage('✅ User created successfully!');
      setNewUser({ username: '', password: '', full_name: '', role: 'farmer', contact_number: '', location: '' });
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Failed to create user'));
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await API.delete(`/auth/users/${id}`);
      setMessage('✅ User deleted');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Failed to delete user');
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e0ddd6', fontSize: 13, outline: 'none',
    background: '#fafaf8', boxSizing: 'border-box',
  };

  const btnStyle = (color = '#2d5a27') => ({
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: color, color: '#fff', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f3ee' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, marginLeft: !isMobile() && sidebarOpen ? 260 : 0, transition: 'margin-left 0.25s ease', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#ffffff', borderBottom: '1px solid #e8e4dc', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#555', padding: 4 }}>☰</button>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Admin Panel</span>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {message && (
            <div style={{ background: message.startsWith('✅') ? '#e8f5e9' : '#fde8e8', border: `1px solid ${message.startsWith('✅') ? '#a5d6a7' : '#f5c6c6'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
              {message}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[['users', 'Manage Users'], ['threshold', 'Threshold Settings']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === key ? '#2d5a27' : '#ffffff', color: activeTab === key ? '#ffffff' : '#555' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Create User */}
              <div style={{ background: '#ffffff', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>Create New User</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  {[
                    ['Username', 'username', 'text'],
                    ['Password', 'password', 'password'],
                    ['Full Name', 'full_name', 'text'],
                    ['Contact Number', 'contact_number', 'text'],
                    ['Location', 'location', 'text'],
                  ].map(([label, key, type]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{label.toUpperCase()}</label>
                      <input type={type} value={newUser[key]} onChange={e => setNewUser(u => ({ ...u, [key]: e.target.value }))} style={inputStyle} placeholder={label} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, display: 'block', marginBottom: 6 }}>ROLE</label>
                    <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} style={inputStyle}>
                      <option value="farmer">Farmer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleCreateUser} style={btnStyle()}>Create User</button>
              </div>

              {/* Users Table */}
              <div style={{ background: '#ffffff', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e4dc' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>All Users ({users.length})</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: '#f8f6f2' }}>
                        {['FULL NAME', 'USERNAME', 'ROLE', 'LOCATION', 'CREATED', 'ACTION'].map(h => (
                          <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 0.8, borderBottom: '1px solid #e8e4dc' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.user_id} style={{ borderBottom: '1px solid #f0ede6' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 500 }}>{u.full_name}</td>
                          <td style={{ padding: '14px 20px', color: '#555' }}>{u.username}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ background: u.role === 'admin' ? '#e8f0e8' : '#f0ede6', color: u.role === 'admin' ? '#2d5a27' : '#888', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {u.role === 'admin' ? 'Admin' : 'Farmer'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#888' }}>{u.location || '—'}</td>
                          <td style={{ padding: '14px 20px', color: '#aaa', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <button onClick={() => handleDeleteUser(u.user_id, u.username)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #f5c6c6', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#c0392b', fontWeight: 600 }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Threshold Tab */}
          {activeTab === 'threshold' && (
            <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, maxWidth: 500 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>Moisture Threshold</h3>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                Alerts trigger when moisture drops below this value. Current threshold: <strong>{threshold}%</strong>
              </p>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, display: 'block', marginBottom: 8 }}>NEW THRESHOLD (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newThreshold}
                onChange={e => setNewThreshold(e.target.value)}
                style={{ ...inputStyle, marginBottom: 16 }}
              />
              <button onClick={handleUpdateThreshold} style={btnStyle()}>Update Threshold</button>

              {/* Guide */}
              <div style={{ marginTop: 20, background: '#f0ede6', borderRadius: 10, padding: 16, fontSize: 13, color: '#555' }}>
                <strong>Guide:</strong>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#1a56db', display: 'inline-block', flexShrink: 0 }} />
                    <span>Above 95% — Overwatering Detected</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2d5a27', display: 'inline-block', flexShrink: 0 }} />
                    <span>{threshold}% – 95% — Normal (no alert)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#e67e22', display: 'inline-block', flexShrink: 0 }} />
                    <span>40% – {threshold}% — Low Moisture alert</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#c0392b', display: 'inline-block', flexShrink: 0 }} />
                    <span>Below 40% — Critical Moisture Drop alert</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}