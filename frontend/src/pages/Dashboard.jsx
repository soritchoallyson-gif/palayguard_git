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
  const [threshold, setThreshold] = useState(70);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState('--:--:--');
  const [userCoords, setUserCoords] = useState({ lat: 15.0143, lon: 120.0805 });
  const [weather, setWeather] = useState({
    temp: '--',
    desc: 'Loading weather...',
    rainMessage: '',
    rainWarning: false,
    maxRainProb: 0,
    next6Hours: [],
    isRainingNow: false,
  });

  // ── Weather fetch with rain prediction ──────────────
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability,precipitation,weathercode&forecast_days=2&timezone=Asia%2FManila`
      );
      const data = await res.json();
      if (!data.current_weather) return;

      const codes = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy',
        3: 'Overcast', 45: 'Foggy', 48: 'Foggy',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        80: 'Rain showers', 81: 'Heavy showers', 95: 'Thunderstorm',
      };
      const desc = codes[data.current_weather.weathercode] || 'Cloudy';

      // Build next 6 hours forecast
      const now = new Date();
      const hourlyTimes = data.hourly.time;
      const hourlyProb = data.hourly.precipitation_probability;
      const hourlyPrecip = data.hourly.precipitation;

      const next6Hours = [];
      let found = 0;
      for (let i = 0; i < hourlyTimes.length && found < 6; i++) {
        const date = new Date(hourlyTimes[i]);
        if (date >= now) {
          next6Hours.push({
            time: hourlyTimes[i],
            prob: hourlyProb[i],
            precip: hourlyPrecip[i],
          });
          found++;
        }
      }

      const maxRainProb = next6Hours.length > 0
        ? Math.max(...next6Hours.map(h => h.prob))
        : 0;

      // Check if raining now
      const rainingCodes = [51, 53, 55, 61, 63, 65, 80, 81, 95, 96];
      const isRainingNow = rainingCodes.includes(data.current_weather.weathercode);

      // Build rain message
      let rainMessage = '';
      let rainWarning = false;

      if (isRainingNow) {
        rainMessage = 'It is currently raining. Check your drainage channels to prevent overwatering.';
        rainWarning = true;
      } else {
        const firstRainHour = next6Hours.find(h => h.prob >= 60);

        if (firstRainHour) {
          const rainTime = new Date(firstRainHour.time);
          const diffMs = rainTime - now;
          const diffMinutes = Math.round(diffMs / 60000);
          rainWarning = firstRainHour.prob >= 70;

          if (diffMinutes <= 60) {
            rainMessage = `It is most likely to rain in approximately ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} with a ${firstRainHour.prob}% chance. ${rainWarning ? 'Prepare your drainage channels now.' : 'Monitor your field closely.'}`;
          } else {
            const hours = Math.floor(diffMinutes / 60);
            const mins = diffMinutes % 60;
            const timeStr = mins > 0
              ? `${hours} hour${hours > 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`
              : `${hours} hour${hours > 1 ? 's' : ''}`;
            rainMessage = `It is most likely to rain in approximately ${timeStr} with a ${firstRainHour.prob}% chance. ${rainWarning ? 'Prepare your drainage channels.' : 'Monitor your soil moisture closely.'}`;
          }
        } else if (maxRainProb >= 40) {
          rainMessage = `There is a ${maxRainProb}% chance of rain in the next 6 hours. No immediate action needed but monitor soil moisture.`;
        } else {
          rainMessage = `No significant rain expected in the next 6 hours (${maxRainProb}% chance). Safe to irrigate if moisture is low.`;
          rainWarning = false;
        }
      }

      setWeather({
        temp: Math.round(data.current_weather.temperature),
        desc,
        rainMessage,
        rainWarning,
        maxRainProb,
        next6Hours,
        isRainingNow,
      });

    } catch (err) {
      setWeather({
        temp: '--',
        desc: 'Weather unavailable',
        rainMessage: 'Unable to fetch weather forecast.',
        rainWarning: false,
        maxRainProb: 0,
        next6Hours: [],
        isRainingNow: false,
      });
    }
  }, []);

  // Get location once on load
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          fetchWeather(coords.lat, coords.lon);
        },
        () => fetchWeather(15.0143, 120.0805)
      );
    } else {
      fetchWeather(15.0143, 120.0805);
    }
  }, [fetchWeather]);

  // Refresh weather every 15 minutes
  useEffect(() => {
    const weatherInterval = setInterval(() => {
      fetchWeather(userCoords.lat, userCoords.lon);
    }, 15 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, [fetchWeather, userCoords]);

  // ── Sensor data fetch ────────────────────────────────
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
      setCriticalAlerts(a.data.filter((al) => al.status === 'critical').slice(0, 3));
      setThreshold(t.data.threshold);
      if (l.data.length > 0) {
        setLastUpdate(
          new Date(l.data[0].timestamp).toLocaleString('en-PH', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })
        );
      }
    } catch {}
  }, []);

  // Smart refresh rate based on moisture condition
  useEffect(() => {
    fetchData();

    const avg = latest.length
      ? latest.reduce((s, r) => s + r.moisture_value, 0) / latest.length
      : 70;

    let refreshRate;
    if (avg > 95 || avg < 40) {
      refreshRate = 30000;       // 30 seconds — critical or overwatering
    } else if (avg < threshold) {
      refreshRate = 60000;       // 1 minute — low moisture
    } else {
      refreshRate = 120000;      // 2 minutes — normal
    }

    const interval = setInterval(fetchData, refreshRate);
    return () => clearInterval(interval);
  }, [fetchData, latest, threshold]);

  // Check rain + moisture for overwatering risk alert
  useEffect(() => {
    if (weather.rainWarning && latest.length > 0) {
      const currentMoisture = latest[0].moisture_value;
      if (currentMoisture >= 60) {
        API.post('/sensors/rain-alert', {
          sensor_id: latest[0].sensor_id,
          moisture: currentMoisture,
          rain_probability: weather.maxRainProb,
        }).catch(() => {});
      }
    }
  }, [weather.rainWarning, weather.maxRainProb, latest]);

  const avgMoisture = latest.length
    ? latest.reduce((s, r) => s + r.moisture_value, 0) / latest.length
    : 0;

  const allNominal = latest.every((r) => r.moisture_value >= threshold);
  const showOverwaterDetected = latest.some(r => r.moisture_value > 95);
  const showOverwaterRisk = weather.rainWarning && latest.some(r => r.moisture_value >= 60) && !showOverwaterDetected;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f3ee' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{
        flex: 1,
        marginLeft: !isMobile() && sidebarOpen ? 260 : 0,
        transition: 'margin-left 0.25s ease',
        minWidth: 0,
      }}>

        {/* Header */}
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#555', padding: 4 }}
            >
              ☰
            </button>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Dashboard</span>
          </div>
          <span onClick={() => navigate('/alerts')} style={{ fontSize: 22, color: '#555', cursor: 'pointer' }}>
            🔔
          </span>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Overwatering Detected Banner */}
          {showOverwaterDetected && (
            <div style={{
              background: '#e8f0ff', border: '1px solid #1a56db',
              borderLeft: '4px solid #1a56db', borderRadius: 10,
              padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ color: '#1a56db', fontSize: 20, marginTop: 2 }}>⚠</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a56db' }}>
                  OVERWATERING DETECTED
                </div>
                <div style={{ fontSize: 12, color: '#1a56db', marginTop: 3 }}>
                  Soil moisture is above 95%. Open drainage channels immediately to prevent oxygen depletion and root damage.
                </div>
              </div>
            </div>
          )}

          {/* Overwatering Risk Banner */}
          {showOverwaterRisk && (
            <div style={{
              background: '#fff3e0', border: '1px solid #e67e22',
              borderLeft: '4px solid #e67e22', borderRadius: 10,
              padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ color: '#e67e22', fontSize: 20, marginTop: 2 }}>⚠</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e67e22' }}>
                  OVERWATERING RISK — Heavy Rain Predicted
                </div>
                <div style={{ fontSize: 12, color: '#e67e22', marginTop: 3 }}>
                  {weather.rainMessage} Soil moisture is currently at {Math.round(avgMoisture)}%.{' '}
                  {avgMoisture >= 70
                    ? 'Open drainage channels before rain arrives.'
                    : 'Prepare drainage channels as a precaution.'}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Row */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

            {/* Moisture Gauge Card */}
            <div style={{
              flex: 2, minWidth: 280,
              background: '#f0ede6', borderRadius: 18, padding: 24,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 24,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    Main Field Saturation
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>Sensor Moisture Level</div>
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
                <div style={{ fontSize: 11, color: '#999', letterSpacing: 1 }}>LAST UPDATE</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', marginTop: 4, color: '#1a1a1a' }}>
                  {lastUpdate}
                </div>
              </div>

              {/* Moisture Status Message */}
              <div style={{
                background: '#e4e0d8', borderRadius: 12,
                padding: '12px 16px', fontSize: 13, color: '#555', lineHeight: 1.6,
              }}>
                {avgMoisture > 95
                  ? 'Soil is overwatered. Open drainage channels immediately.'
                  : avgMoisture >= threshold
                  ? 'Soil moisture is in the normal range. No irrigation needed.'
                  : avgMoisture >= 40
                  ? 'Soil moisture is low. Prepare to irrigate soon.'
                  : 'Soil moisture is critically low. Immediate irrigation required.'}
              </div>
            </div>

            {/* Right Column */}
            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Weather Card */}
              <div style={{ background: '#ffffff', borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#999', letterSpacing: 1, marginBottom: 10 }}>
                  LOCAL ATMOSPHERE
                </div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>{weather.temp}°C</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4, marginBottom: 12 }}>
                  {weather.desc}
                </div>

                {/* Rain Forecast Message */}
                {weather.rainMessage && (
                  <div style={{
                    background: weather.rainWarning ? '#fff3e0' : '#f0f7ee',
                    border: `1px solid ${weather.rainWarning ? '#e67e22' : '#2d5a27'}`,
                    borderRadius: 10, padding: '10px 12px',
                    fontSize: 11,
                    color: weather.rainWarning ? '#e67e22' : '#2d5a27',
                    fontWeight: 500, marginBottom: 12, lineHeight: 1.6,
                  }}>
                    {weather.rainMessage}
                  </div>
                )}

                {/* 6-Hour Rain Probability Bars */}
                {weather.next6Hours && weather.next6Hours.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#aaa', marginBottom: 6, letterSpacing: 0.5 }}>
                      RAIN PROBABILITY — NEXT 6 HOURS
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {weather.next6Hours.map((h, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{
                            height: 36, background: '#f0ede6',
                            borderRadius: 4, position: 'relative', overflow: 'hidden',
                          }}>
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              height: `${h.prob}%`,
                              background: h.prob >= 70 ? '#1a56db' : h.prob >= 40 ? '#e67e22' : '#2d5a27',
                              opacity: 0.75,
                            }} />
                          </div>
                          <div style={{ fontSize: 9, color: '#aaa', marginTop: 3 }}>
                            {new Date(h.time).getHours()}:00
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#555' }}>
                            {h.prob}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Sensors */}
              <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, flex: 1 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 14,
                }}>
                  <span style={{ fontSize: 11, color: '#999', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Active Sensors
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: allNominal ? '#2d5a27' : '#c0392b' }}>
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
                    <span style={{ fontWeight: 700, color: r.moisture_value < threshold ? '#c0392b' : '#2d5a27' }}>
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

          {/* Admin View */}
          {role === 'admin' && (
            <div style={{
              background: '#fff', borderRadius: 16,
              padding: 20, border: '2px solid #2d5a27',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2d5a27', marginBottom: 4 }}>
                Admin View
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                You are logged in as <strong>{fullName}</strong>. You have full access to all system data and controls.
              </div>
            </div>
          )}

          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Sensor Alert</h3>
              {criticalAlerts.map((a) => (
                <div key={a.alert_id} style={{
                  background: '#fde8e8', border: '1px solid #f5c6c6',
                  borderLeft: '4px solid #c0392b', borderRadius: 10,
                  padding: '14px 18px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ color: '#c0392b', fontSize: 20 }}>⚠</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#c0392b' }}>
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

          {/* Moisture History Chart */}
          {readings.length > 0 && (
            <div style={{ background: '#ffffff', borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Moisture History</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                        + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                    tick={{ fontSize: 10, fill: '#999' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip
                    formatter={(v) => [`${Math.round(v)}%`, 'Moisture']}
                    labelFormatter={(v) => new Date(v).toLocaleString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
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