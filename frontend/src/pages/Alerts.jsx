import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import API from '../api';
import { useNavigate } from 'react-router-dom';

const isMobile = () => window.innerWidth < 768;

export default function Alerts() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState({ critical: true, warnings: true });

  const fetchAlerts = async () => {
    try {
      const res = await API.get('/alerts');
      setAlerts(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id) => {
    await API.patch(`/alerts/${id}/acknowledge`);
    fetchAlerts();
  };

  const handleResolve = async (id) => {
    await API.patch(`/alerts/${id}/resolve`);
    fetchAlerts();
  };

  const filtered = alerts.filter((a) => {
    if (a.status === 'critical' && !filter.critical) return false;
    if (['pending', 'acknowledged'].includes(a.status) && !filter.warnings)
      return false;
    return true;
  });

  const statusColor = {
    critical: '#c0392b',
    acknowledged: '#888888',
    resolved: '#2d5a27',
    pending: '#e67e22',
  };

  const statusDotColor = {
    critical: '#c0392b',
    acknowledged: '#e67e22',
    resolved: '#2d5a27',
    pending: '#888888',
  };

  const alertBgColor = {
    'Critical Moisture Drop': '#fde8e8',
    'Low Moisture': '#fef3e2',
  };

  const alertTextColor = {
    'Critical Moisture Drop': '#c0392b',
    'Low Moisture': '#e67e22',
  };

  const timeAgo = (dateStr) => {
    const diff = Math.round((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.round(diff / 60)} hours ago`;
    return 'Yesterday';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f3ee' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{
        flex: 1,
        marginLeft: !isMobile() && sidebarOpen ? 260 : 0,
        transition: 'margin-left 0.25s ease',
        minWidth: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px', background: '#ffffff',
          borderBottom: '1px solid #e8e4dc',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 22, color: '#555', padding: 4,
              }}
            >
              ☰
            </button>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Alerts</span>
          </div>
          <span
  onClick={() => navigate('/alerts')}
  style={{
    fontSize: 22, color: '#555',
    cursor: 'pointer',
  }}
>
  🔔
</span>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{
            background: '#ffffff', borderRadius: 14,
            padding: '16px 20px', display: 'inline-block',
            marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: 1, color: '#888', marginBottom: 12,
              textTransform: 'uppercase',
            }}>
              Severity Filter
            </div>
            {[['critical', 'Critical Errors'], ['warnings', 'Warnings']].map(
              ([key, label]) => (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center',
                  gap: 10, cursor: 'pointer', fontSize: 14,
                  marginBottom: 8, color: '#333',
                }}>
                  <input
                    type="checkbox"
                    checked={filter[key]}
                    onChange={() =>
                      setFilter((f) => ({ ...f, [key]: !f[key] }))
                    }
                    style={{
                      accentColor: '#2d5a27',
                      width: 16, height: 16,
                      cursor: 'pointer',
                    }}
                  />
                  {label}
                </label>
              )
            )}
          </div>

          <div style={{
            background: '#f0ede6', borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '12px 20px', fontSize: 12,
              color: '#999', textAlign: 'right',
              borderBottom: '1px solid #e8e4dc',
              background: '#f8f6f2',
            }}>
              Showing all alert logs
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: 13, minWidth: 600,
              }}>
                <thead>
                  <tr style={{ background: '#f8f6f2' }}>
                    {['TIMESTAMP', 'SENSOR', 'ALERT TYPE', 'STATUS', 'ACTIONS'].map(
                      (h) => (
                        <th key={h} style={{
                          padding: '12px 20px', textAlign: 'left',
                          fontSize: 11, color: '#888', fontWeight: 700,
                          letterSpacing: 0.8, borderBottom: '1px solid #e8e4dc',
                        }}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.alert_id} style={{
                      borderBottom: '1px solid #e8e4dc',
                      background: '#ffffff',
                    }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a' }}>
                          {new Date(a.sent_at).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
                          {timeAgo(a.sent_at)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{
                            width: 9, height: 9, borderRadius: '50%',
                            background: statusDotColor[a.status] || '#888',
                            display: 'inline-block', flexShrink: 0,
                          }} />
                          <span style={{ color: '#333' }}>{a.device_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          background: alertBgColor[a.alert_type] || '#f0ede6',
                          color: alertTextColor[a.alert_type] || '#888',
                          padding: '4px 12px', borderRadius: 20,
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {a.alert_type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontWeight: 700, fontSize: 12,
                          color: statusColor[a.status] || '#888',
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {a.status === 'critical' && (
                          <button
                            onClick={() => handleAcknowledge(a.alert_id)}
                            style={{
                              padding: '6px 14px', borderRadius: 8,
                              border: '1px solid #ddd', background: '#fff',
                              cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              color: '#333',
                            }}
                          >
                            Acknowledge
                          </button>
                        )}
                        {a.status === 'acknowledged' && (
                          <button
                            onClick={() => handleResolve(a.alert_id)}
                            style={{
                              padding: '6px 14px', borderRadius: 8,
                              border: '1px solid #2d5a27', background: '#fff',
                              cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              color: '#2d5a27',
                            }}
                          >
                            Resolve
                          </button>
                        )}
                        {a.status === 'resolved' && (
                          <span style={{ fontSize: 18 }}>📋</span>
                        )}
                        {a.status === 'pending' && (
                          <span style={{ fontSize: 18, color: '#aaa' }}>⋮</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{
                        padding: 48, textAlign: 'center',
                        color: '#aaa', fontSize: 14,
                      }}>
                        No alerts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}