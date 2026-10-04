import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import riceField from '../assets/ricefield.jpg';
import logo from '../assets/palayguard_logo.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const featuresRef = useRef(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1a1a1a', margin: 0, padding: 0 }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 40px',
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={logo}
            alt="PalayGuard"
            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{ fontWeight: 700, fontSize: 17, color: '#1E4D2B', letterSpacing: 0.3 }}>
            PalayGuard
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '9px 26px', borderRadius: 24,
            background: '#1E4D2B', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', letterSpacing: 0.3,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = '#2d5a27'}
          onMouseLeave={e => e.target.style.background = '#1E4D2B'}
        >
          Log In
        </button>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        minHeight: '100vh',
        backgroundImage: `url(${riceField})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        position: 'relative',
        display: 'flex', alignItems: 'center',
      }}>
        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 100%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          padding: '0 60px', maxWidth: 680,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 20, padding: '6px 16px',
            marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 500 }}>Live Soil Monitoring — Active</span>
          </div>

          <h1 style={{
            fontSize: 56, fontWeight: 800,
            color: '#ffffff', margin: '0 0 16px',
            lineHeight: 1.1, letterSpacing: -1,
          }}>
            Know your field.<br />
            <span style={{ color: '#86efac' }}>Before it's too late.</span>
          </h1>

          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,0.82)',
            margin: '0 0 40px', lineHeight: 1.7, maxWidth: 520,
          }}>
            PalayGuard monitors rice paddy soil moisture in real time using IoT sensors —
            alerting farmers the moment conditions turn critical, and predicting overwatering
            before heavy rain arrives.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '14px 36px', borderRadius: 28,
                background: '#1E4D2B', color: '#fff',
                border: 'none', fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(30,77,43,0.5)',
              }}
              onMouseEnter={e => e.target.style.background = '#2d5a27'}
              onMouseLeave={e => e.target.style.background = '#1E4D2B'}
            >
              Open Dashboard
            </button>
            <button
              onClick={scrollToFeatures}
              style={{
                padding: '14px 36px', borderRadius: 28,
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.5)',
                fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div style={{
        background: '#1E4D2B',
        padding: '32px 40px',
        display: 'flex', justifyContent: 'center',
        gap: 64, flexWrap: 'wrap',
      }}>
        {[
          { value: '1hr', label: 'Sensor update interval' },
          { value: '4', label: 'Alert severity levels' },
          { value: '6hrs', label: 'Rain forecast window' },
          { value: '24/7', label: 'Cloud uptime' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#86efac', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, letterSpacing: 0.3 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <div ref={featuresRef} style={{ padding: '80px 40px', background: '#f7f9f5' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 12, color: '#2d5a27', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>
            FEATURES
          </p>
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px', color: '#1a1a1a', lineHeight: 1.2 }}>
            Everything a rice farmer needs
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 52, maxWidth: 500, lineHeight: 1.6 }}>
            Built specifically for Philippine rice cultivation — not a generic IoT template.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {[
              {
                icon: '📡',
                title: 'Direct IoT Integration',
                desc: 'Arduino sensor sends moisture readings every 1 hour directly to the cloud.',
              },
              {
                icon: '🚨',
                title: 'Four-Level Alert System',
                desc: 'Normal, Low Moisture, Critical Drop, and Overwatering — each with smart cooldown logic to prevent alert fatigue.',
              },
              {
                icon: '🌧️',
                title: 'Rain Prediction',
                desc: '"Rain expected in 40 minutes with 75% chance." PalayGuard tells farmers exactly when to open drainage before the rain arrives.',
              },
              {
                icon: '📊',
                title: 'Live Dashboard',
                desc: 'Moisture gauge, history chart, and weather forecast — all in one screen. Adaptive refresh speeds up when conditions turn critical.',
              },
              {
                icon: '🔑',
                title: 'Role-Based Access',
                desc: 'Admin manages users and threshold settings. Farmers monitor their field. Each sees only what they need.',
              },
              {
                icon: '⚙️',
                title: 'Configurable Threshold',
                desc: 'Set the moisture trigger point to match your crop\'s growth stage.',
              },
            ].map(f => (
              <div
                key={f.title}
                style={{
                  background: '#ffffff', borderRadius: 14,
                  padding: '28px 24px',
                  border: '1px solid #e8f0e9',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(30,77,43,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px', color: '#1a1a1a' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ padding: '80px 40px', background: '#ffffff' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 36, color: '#2d5a27', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>
            HOW IT WORKS
          </p>
         

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              {
                num: '01',
                title: 'Sensor reads the soil',
                desc: 'The Arduino soil moisture sensor measures water content in the rice paddy at the root zone. The raw reading is converted to a percentage using field-calibrated values.',
              },
              {
                num: '02',
                title: 'Arduino sends it to the cloud',
                desc: 'Every hour, the Arduino connects via WiFi and sends the moisture reading directly to the Railway backend with an authenticated HTTP POST request.',
              },
              {
                num: '03',
                title: 'Smart logic classifies the data',
                desc: 'The backend evaluates the reading against a four-level alert system and checks the weather forecast. If rain is likely and soil is already elevated, an Overwatering Risk alert is created immediately.',
              },
              {
                num: '04',
                title: 'Farmer sees it on the dashboard',
                desc: 'The live gauge, alert banners, and rain forecast message update automatically. The farmer knows the exact moisture level, what action to take, and how long before rain arrives.',
              },
            ].map((step, i, arr) => (
              <div key={step.num} style={{ display: 'flex', gap: 28, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#1E4D2B', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                    letterSpacing: 0.5,
                  }}>
                    {step.num}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: '#e2ede4', margin: '6px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 36 : 0 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: '8px 0 10px', color: '#1a1a1a' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SDG SECTION ── */}
      <div style={{ padding: '80px 40px', background: '#f7f9f5' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 12, color: '#2d5a27', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>
            UN SUSTAINABLE DEVELOPMENT GOALS
          </p>
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 48px', color: '#1a1a1a' }}>
            Built for a bigger purpose
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              {
                number: 'SDG 2', title: 'Zero Hunger', color: '#DDA63A',
                desc: 'Protecting rice crops from moisture stress helps ensure food security for Filipino communities that depend on rice as their primary food source.',
              },
              {
                number: 'SDG 9', title: 'Industry & Innovation', color: '#F36D25',
                desc: 'Bringing IoT technology to traditional rice farming.',
              },
              {
                number: 'SDG 13', title: 'Climate Action', color: '#3F7E44',
                desc: 'Smart water management and rain-based overwatering prevention help farmers adapt to unpredictable weather and conserve water resources.',
              },
            ].map(sdg => (
              <div key={sdg.number} style={{
                background: '#ffffff', borderRadius: 14,
                padding: '24px 22px',
                borderTop: `4px solid ${sdg.color}`,
                border: '1px solid #e8f0e9',
                borderTopColor: sdg.color,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: sdg.color, letterSpacing: 1, marginBottom: 8 }}>
                  {sdg.number}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px', color: '#1a1a1a' }}>
                  {sdg.title}
                </h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, margin: 0 }}>
                  {sdg.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{
        padding: '80px 40px',
        background: '#1E4D2B',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 38, fontWeight: 800, color: '#ffffff', margin: '0 0 16px', lineHeight: 1.2 }}>
          Ready to monitor your field?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', margin: '0 0 36px' }}>
          Log in with the credentials provided by your administrator.
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '15px 48px', borderRadius: 30,
            background: '#ffffff', color: '#1E4D2B',
            border: 'none', fontSize: 15, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
          onMouseEnter={e => e.target.style.background = '#f0f9f2'}
          onMouseLeave={e => e.target.style.background = '#ffffff'}
        >
          Go to Login
        </button>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: '24px 40px',
        background: '#122d1a',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logo} alt="PalayGuard" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>PalayGuard</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Gordon College — College of Computer Studies, Olongapo City
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          IoT-Based Smart Rice Field Soil Monitoring System
        </div>
      </div>

    </div>
  );
}