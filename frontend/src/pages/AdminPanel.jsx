import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import API from '../api';

const isMobile = () => window.innerWidth < 768;

const EMPTY_USER = { username: '', password: '', full_name: '', role: 'farmer', contact_number: '', location: '' };
const EMPTY_SENSOR = { user_id: '', device_name: '', location_description: '' };

export default function AdminPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const [activeTab, setActiveTab] = useState('users');
  const [message, setMessage] = useState('');

  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState(EMPTY_USER);

  const [sensors, setSensors] = useState([]);
  const [newSensor, setNewSensor] = useState(EMPTY_SENSOR);
  const [issuedKey, setIssuedKey] = useState(null);

  const [thresholdScope, setThresholdScope] = useState('');
  const [threshold, setThreshold] = useState(70);
  const [thresholdCustom, setThresholdCustom] = useState(false);
  const [newThreshold, setNewThreshold] = useState('');

  const flash = (text, ms = 3500) => {
    setMessage(text);
    if (ms) setTimeout(() => setMessage(''), ms);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await API.get('/auth/users');
      setUsers(res.data);
    } catch {}
  }, []);

  const fetchSensors = useCallback(async () => {
    try {
      const res = await API.get('/sensors/sensors');
      setSensors(res.data);
    } catch {}
  }, []);

  const fetchThreshold = useCallback(async (scope) => {
    try {
      const res = await API.get('/sensors/threshold', { params: scope ? { user_id: scope } : {} });
      setThreshold(res.data.threshold);
      setThresholdCustom(!!res.data.custom);
      setNewThreshold(res.data.threshold);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchSensors();
  }, [fetchUsers, fetchSensors]);

  useEffect(() => {
    fetchThreshold(thresholdScope);
  }, [fetchThreshold, thresholdScope]);

  // ── Users ──
  const handleCreateUser = async () => {
    try {
      await API.post('/auth/register', newUser);
      flash('✅ User created successfully!');
      setNewUser(EMPTY_USER);
      fetchUsers();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to create user'), 0);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await API.delete(`/auth/users/${id}`);
      flash('✅ User deleted');
      fetchUsers();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to delete user'), 6000);
    }
  };

  // ── Sensors ──
  const handleCreateSensor = async () => {
    try {
      const res = await API.post('/sensors/sensors', newSensor);
      setIssuedKey({ sensor_id: res.data.sensor_id, device_name: newSensor.device_name, api_key: res.data.api_key });
      setNewSensor(EMPTY_SENSOR);
      flash('✅ Sensor registered. Copy its key below — it is shown only once.', 0);
      fetchSensors();
      fetchUsers();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to create sensor'), 0);
    }
  };

  const handleReassign = async (sensorId, userId) => {
    try {
      await API.patch(`/sensors/sensors/${sensorId}`, { user_id: userId === '' ? null : userId });
      flash('✅ Sensor reassigned');
      fetchSensors();
      fetchUsers();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to reassign sensor'));
    }
  };

  const handleToggleStatus = async (sensor) => {
    try {
      await API.patch(`/sensors/sensors/${sensor.sensor_id}`, {
        status: sensor.status === 'inactive' ? 'active' : 'inactive',
      });
      fetchSensors();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to update sensor'));
    }
  };

  const handleRegenerateKey = async (sensor) => {
    if (!window.confirm(`Generate a new key for "${sensor.device_name}"? The old key stops working immediately, so the Arduino must be updated.`)) return;
    try {
      const res = await API.post(`/sensors/sensors/${sensor.sensor_id}/regenerate-key`);
      setIssuedKey({ sensor_id: sensor.sensor_id, device_name: sensor.device_name, api_key: res.data.api_key });
      flash('✅ New key generated. Copy it below — it is shown only once.', 0);
      fetchSensors();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to generate key'));
    }
  };

  const handleDeleteSensor = async (sensor) => {
    if (!window.confirm(`Delete "${sensor.device_name}" and ALL of its readings and alerts? This cannot be undone.`)) return;
    try {
      await API.delete(`/sensors/sensors/${sensor.sensor_id}`);
      flash('✅ Sensor deleted');
      fetchSensors();
      fetchUsers();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to delete sensor'));
    }
  };

  const copyKeySnippet = () => {
    if (!issuedKey) return;
    const text = `#define SENSOR_ID ${issuedKey.sensor_id}\n#define API_KEY   "${issuedKey.api_key}"`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => flash('✅ Copied to clipboard', 2000));
  };

  // ── Threshold ──
  const scopeName = thresholdScope
    ? (users.find((u) => String(u.user_id) === String(thresholdScope))?.full_name || 'this farmer')
    : 'all farmers (default)';

  const saveThreshold = async (value) => {
    try {
      const body = { threshold: value };
      if (thresholdScope) body.user_id = thresholdScope;
      await API.post('/sensors/threshold', body);
      flash(value === null ? '✅ Reset to the default threshold' : '✅ Threshold updated successfully!');
      fetchThreshold(thresholdScope);
      fetchUsers();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.message || 'Failed to update threshold'));
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e0ddd6', fontSize: 13, outline: 'none',
    background: '#fafaf8', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, display: 'block', marginBottom: 6 };
  const btnStyle = (color = '#2d5a27') => ({
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  });
  const smallBtn = (color = '#555', border = '#ddd') => ({
    padding: '5px 12px', borderRadius: 8, border: `1px solid ${border}`,
    background: '#fff', cursor: 'pointer', fontSize: 12, color, fontWeight: 600,
  });
  const thStyle = {
    padding: '12px 20px', textAlign: 'left', fontSize: 11, color: '#888',
    fontWeight: 700, letterSpacing: 0.8, borderBottom: '1px solid #e8e4dc',
  };

  const ownerOptions = users.filter((u) => u.role === 'farmer');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f3ee' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, marginLeft: !isMobile() && sidebarOpen ? 260 : 0, transition: 'margin-left 0.25s ease', minWidth: 0 }}>

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

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {[['users', 'Manage Users'], ['sensors', 'Sensors'], ['threshold', 'Threshold Settings']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === key ? '#2d5a27' : '#ffffff', color: activeTab === key ? '#ffffff' : '#555' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ───── Users ───── */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                      <label style={labelStyle}>{label.toUpperCase()}</label>
                      <input type={type} value={newUser[key]} onChange={e => setNewUser(u => ({ ...u, [key]: e.target.value }))} style={inputStyle} placeholder={label} />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle}>ROLE</label>
                    <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} style={inputStyle}>
                      <option value="farmer">Farmer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleCreateUser} style={btnStyle()}>Create User</button>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e4dc' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>All Users ({users.length})</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                    <thead>
                      <tr style={{ background: '#f8f6f2' }}>
                        {['FULL NAME', 'USERNAME', 'ROLE', 'SENSORS', 'LOCATION', 'CREATED', 'ACTION'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
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
                          <td style={{ padding: '14px 20px', color: u.sensor_count > 0 ? '#2d5a27' : '#aaa', fontWeight: 600 }}>{u.sensor_count}</td>
                          <td style={{ padding: '14px 20px', color: '#888' }}>{u.location || '—'}</td>
                          <td style={{ padding: '14px 20px', color: '#aaa', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <button onClick={() => handleDeleteUser(u.user_id, u.username)} style={smallBtn('#c0392b', '#f5c6c6')}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ───── Sensors ───── */}
          {activeTab === 'sensors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {issuedKey && (
                <div style={{ background: '#fff8e1', border: '1px solid #f0d78c', borderLeft: '4px solid #e6a700', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#8a6100', marginBottom: 6 }}>
                    Device key for "{issuedKey.device_name}" — copy it now, it will not be shown again
                  </div>
                  <div style={{ fontSize: 12, color: '#8a6100', marginBottom: 10 }}>
                    Put these two lines at the top of the Arduino sketch (replacing the old SENSOR_ID and API_KEY):
                  </div>
                  <pre style={{ background: '#ffffff', border: '1px solid #f0d78c', borderRadius: 8, padding: 12, fontSize: 12, overflowX: 'auto', margin: '0 0 12px' }}>
{`#define SENSOR_ID ${issuedKey.sensor_id}
#define API_KEY   "${issuedKey.api_key}"`}
                  </pre>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={copyKeySnippet} style={btnStyle('#e6a700')}>Copy</button>
                    <button onClick={() => { setIssuedKey(null); setMessage(''); }} style={smallBtn()}>I saved it — dismiss</button>
                  </div>
                </div>
              )}

              <div style={{ background: '#ffffff', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#1a1a1a' }}>Register a Sensor</h3>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
                  Each sensor belongs to one farmer and gets its own secret key. Only that farmer (and admins) can see its data.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>OWNER (FARMER)</label>
                    <select value={newSensor.user_id} onChange={e => setNewSensor(s => ({ ...s, user_id: e.target.value }))} style={inputStyle}>
                      <option value="">Select a farmer...</option>
                      {ownerOptions.map(u => (
                        <option key={u.user_id} value={u.user_id}>{u.full_name || u.username}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>DEVICE NAME</label>
                    <input value={newSensor.device_name} onChange={e => setNewSensor(s => ({ ...s, device_name: e.target.value }))} style={inputStyle} placeholder="e.g. Sensor A" />
                  </div>
                  <div>
                    <label style={labelStyle}>LOCATION</label>
                    <input value={newSensor.location_description} onChange={e => setNewSensor(s => ({ ...s, location_description: e.target.value }))} style={inputStyle} placeholder="e.g. Zone A - North Field" />
                  </div>
                </div>
                <button onClick={handleCreateSensor} style={btnStyle()}>Register Sensor</button>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e4dc' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>All Sensors ({sensors.length})</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: '#f8f6f2' }}>
                        {['ID', 'DEVICE', 'OWNER', 'LOCATION', 'STATUS', 'DEVICE KEY', 'LAST READING', 'ACTIONS'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sensors.map(s => (
                        <tr key={s.sensor_id} style={{ borderBottom: '1px solid #f0ede6' }}>
                          <td style={{ padding: '14px 20px', color: '#888' }}>{s.sensor_id}</td>
                          <td style={{ padding: '14px 20px', fontWeight: 500 }}>{s.device_name}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <select
                              value={s.user_id ?? ''}
                              onChange={e => handleReassign(s.sensor_id, e.target.value)}
                              style={{ ...inputStyle, padding: '6px 10px', width: 'auto', minWidth: 150 }}
                            >
                              <option value="">Unassigned</option>
                              {users.map(u => (
                                <option key={u.user_id} value={u.user_id}>{u.full_name || u.username}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#888' }}>{s.location_description || '—'}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ background: s.status === 'inactive' ? '#f0ede6' : '#e8f5e9', color: s.status === 'inactive' ? '#888' : '#2d5a27', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {s.status === 'inactive' ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            {s.has_key ? (
                              <span style={{ color: '#2d5a27', fontSize: 12, fontWeight: 600 }}>Own key</span>
                            ) : (
                              <span title="This sensor still uses the old shared key. Generate its own key, then update the Arduino." style={{ color: '#e67e22', fontSize: 12, fontWeight: 600 }}>Shared key (old)</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#aaa', fontSize: 12 }}>
                            {s.last_reading ? new Date(s.last_reading).toLocaleString() : 'No data yet'}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button onClick={() => handleRegenerateKey(s)} style={smallBtn('#2d5a27', '#2d5a27')}>
                                {s.has_key ? 'New key' : 'Create key'}
                              </button>
                              <button onClick={() => handleToggleStatus(s)} style={smallBtn()}>
                                {s.status === 'inactive' ? 'Enable' : 'Disable'}
                              </button>
                              <button onClick={() => handleDeleteSensor(s)} style={smallBtn('#c0392b', '#f5c6c6')}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {sensors.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>No sensors registered yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ───── Threshold ───── */}
          {activeTab === 'threshold' && (
            <div style={{ background: '#ffffff', borderRadius: 16, padding: 24, maxWidth: 500 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>Moisture Threshold</h3>

              <label style={labelStyle}>APPLIES TO</label>
              <select value={thresholdScope} onChange={e => setThresholdScope(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
                <option value="">All farmers (default)</option>
                {ownerOptions.map(u => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name || u.username}{u.moisture_threshold !== null && u.moisture_threshold !== undefined ? ` — custom (${u.moisture_threshold}%)` : ''}
                  </option>
                ))}
              </select>

              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                Alerts trigger for <strong>{scopeName}</strong> when moisture drops below this value. Current threshold: <strong>{threshold}%</strong>
                {thresholdScope && !thresholdCustom ? ' (using the default)' : ''}
              </p>
              <label style={labelStyle}>NEW THRESHOLD (%)</label>
              <input type="number" min="0" max="100" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => saveThreshold(parseFloat(newThreshold))} style={btnStyle()}>Update Threshold</button>
                {thresholdScope && thresholdCustom && (
                  <button onClick={() => saveThreshold(null)} style={{ ...btnStyle('#ffffff'), color: '#555', border: '1px solid #ddd' }}>
                    Reset to default
                  </button>
                )}
              </div>

              <div style={{ marginTop: 20, background: '#f0ede6', borderRadius: 10, padding: 16, fontSize: 13, color: '#555' }}>
                <strong>Guide:</strong>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['#1a56db', 'Above 95% — Overwatering Detected'],
                    ['#2d5a27', `${threshold}% – 95% — Normal (no alert)`],
                    ['#e67e22', `40% – ${threshold}% — Low Moisture alert`],
                    ['#c0392b', 'Below 40% — Critical Moisture Drop alert'],
                  ].map(([color, text]) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}