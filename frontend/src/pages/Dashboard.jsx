import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import MoistureGauge from '../components/MoistureGauge';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const isMobile = () => window.innerWidth < 768;

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const role = localStorage.getItem('role');
  const fullName = localStorage.getItem('full_name');
  const [readings, setReadings] = useState([]);
  const [latest, setLatest] = useState([]);
  const [threshold, setThreshold] = useState(40);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState('--:--:--');

  const fetchData = useCallback(async () => {
    try {
      const [r, l, a, t] = await Promise.all([
        API.get('/sensors/readings'),
        API.get('/sensors/readings/latest'),
        API.get('/alerts'),
        API.get('/sensors/threshold'),
      ]);
      setReadings(r.data.slice(0, 20).reverse());
      setLatest(l.data);
      setCriticalAlerts(
        a.data.filter((al) => al.status === 'critical').slice(0, 3)
      );
      setThreshold(t.data.threshold);
      if (l.data.length > 0) {
        setLastUpdate(
          new Date(l.data[0].timestamp).toLocaleTimeString()
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const avgMoisture =
    latest.length
      ? latest.reduce((s, r) => s + r.moisture_value, 0) / latest.length
      : 0;

  const allNominal = latest.every((r) => r.moisture_value >= threshold);

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
          padding: '14px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e8e4dc',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 22, color: '#555',
                padding: 4,
              }}
            >
              ☰
            </button>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Dashboard</span>
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

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

            <div style={{
              flex: 2, minWidth: 280,
              background: '#f0ede6',
              borderRadius: 18, padding: 24,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 24,
              }}>
                <div>
                  <div style={{
                    fontSize: 11, color: '#999',
                    letterSpacing: 1, textTransform: 'uppercase',
                    marginBottom: 4,
                  }}>
                    Main Field Saturation
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    Sensor Moisture Level
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#ddeedd', borderRadius: 20,
                  padding: '5px 12px', fontSize: 11,
                  color: '#2d5a27', fontWeight: 700,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#2d5a27', display: 'inline-block',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  LIVE TELEMETRY
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <MoistureGauge value={avgMoisture} threshold={threshold} />
              </div>

              <div style={{
                background: '#e4e0d8', borderRadius: 12,
                padding: '14px 20px', textAlign: 'center', marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, color: '#999', letterSpacing: 1 }}>
                  LAST UPDATE
                </div>
                <div style={{
                  fontSize: 30, fontWeight: 700,
                  fontFamily: 'monospace', marginTop: 4, color: '#1a1a1a',
                }}>
                  {lastUpdate}
                </div>
              </div>

              <div style={{
                background: '#e4e0d8', borderRadius: 12,
                padding: '12px 16px', fontSize: 13,
                color: '#555', lineHeight: 1.6,
              }}>
                System is currently in{' '}
                <strong>
                  {avgMoisture < threshold
                    ? 'Critical Irrigation Mode'
                    : 'Adaptive Conservation'}
                </strong>{' '}
                mode.{' '}
                {avgMoisture < threshold
                  ? 'Moisture levels are critically low. Immediate irrigation required.'
                  : 'Evapotranspiration rates are low due to current field conditions in Zone A.'}
              </div>
            </div>

            <div style={{
              flex: 1, minWidth: 200,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{
                background: '#ffffff', borderRadius: 16, padding: 20,
              }}>
                <div style={{
                  fontSize: 11, color: '#999',
                  letterSpacing: 1, marginBottom: 10,
                }}>
                  ☁ LOCAL ATMOSPHERE
                </div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>24°C</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                  Partly Cloudy
                </div>
              </div>

              <div style={{
                background: '#ffffff', borderRadius: 16,
                padding: 20, flex: 1,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 14,
                }}>
                  <span style={{
                    fontSize: 11, color: '#999',
                    letterSpacing: 1, textTransform: 'uppercase',
                  }}>
                    Active Sensors
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: allNominal ? '#2d5a27' : '#c0392b',
                  }}>
                    {allNominal ? 'All Nominal' : 'Alert'}
                  </span>
                </div>
                {latest.map((r) => (
                  <div key={r.sensor_id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '10px 0',
                    borderBottom: '1px solid #f0ede6', fontSize: 14,
                  }}>
                    <span style={{ color: '#333' }}>{r.device_name}</span>
                    <span style={{
                      fontWeight: 700,
                      color: r.moisture_value < threshold ? '#c0392b' : '#2d5a27',
                    }}>
                      {Math.round(r.moisture_value)}%
                    </span>
                  </div>
                ))}
                {latest.length === 0 && (
                  <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '20px 0' }}>
                    No sensor data yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {criticalAlerts.length > 0 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                
                {role === 'admin' && (
  <div style={{
    background: '#fff', borderRadius: 16,
    padding: 20, border: '2px solid #2d5a27',
  }}>
    <div style={{
      fontSize: 13, fontWeight: 700,
      color: '#2d5a27', marginBottom: 4,
    }}>
      🔑 Admin View
    </div>
    <div style={{ fontSize: 13, color: '#555' }}>
      You are logged in as <strong>{fullName}</strong>.
      You have full access to all system data and controls.
    </div>
  </div>
)}
                Sensor Alert
              </h3>
              {criticalAlerts.map((a) => (
                <div key={a.alert_id} style={{
                  background: '#fde8e8',
                  border: '1px solid #f5c6c6',
                  borderLeft: '4px solid #c0392b',
                  borderRadius: 10, padding: '14px 18px',
                  marginBottom: 8, display: 'flex',
                  alignItems: 'center', gap: 12,
                }}>
                  <span style={{ color: '#c0392b', fontSize: 20 }}>⚠</span>
                  <div>
                    <div style={{
                      fontWeight: 700, fontSize: 14, color: '#c0392b',
                    }}>
                      CRITICAL ALERT: {a.device_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#d07070', marginTop: 3 }}>
                      Moisture below {threshold}% threshold. Immediate attention required.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {readings.length > 0 && (
            <div style={{
              background: '#ffffff', borderRadius: 16, padding: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
                Moisture History
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })
                    }
                    tick={{ fontSize: 11, fill: '#999' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#999' }}
                  />
                  <Tooltip
                    formatter={(v) => [`${Math.round(v)}%`, 'Moisture']}
                    labelFormatter={(v) => new Date(v).toLocaleTimeString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="moisture_value"
                    stroke="#2d5a27"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#2d5a27' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}