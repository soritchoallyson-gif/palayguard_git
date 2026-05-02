import React from 'react';

export default function MoistureGauge({ value, threshold }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  const isCritical = pct < threshold;
  const color = isCritical ? '#c0392b' : '#2d5a27';
  const r = 80;
  const cx = 100;
  const cy = 100;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: 200, width: 200 }}>
      <svg
        width="200"
        height="200"
        style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
      >
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#e8e4dc"
          strokeWidth="14"
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.5s ease' }}
        />
      </svg>

      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
          {Math.round(pct)}
          <span style={{ fontSize: 22 }}>%</span>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: isCritical ? '#c0392b' : '#2d5a27',
          marginTop: 6,
          textTransform: 'uppercase',
        }}>
          {isCritical ? 'CRITICAL DRY' : 'SATURATED'}
        </div>
      </div>
    </div>
  );
}