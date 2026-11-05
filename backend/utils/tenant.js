const crypto = require('crypto');
const db = require('../db');

const DEFAULT_THRESHOLD = 70;

// Limits a query to the sensors the caller may see.
// farmer: only their own. admin: all, or one farmer's with ?user_id=
function sensorScope(req, alias = 's') {
  if (req.user.role === 'admin') {
    const wanted = parseInt(req.query.user_id, 10);
    if (!isNaN(wanted)) return { clause: `${alias}.user_id = ?`, params: [wanted] };
    return { clause: '1=1', params: [] };
  }
  return { clause: `${alias}.user_id = ?`, params: [req.user.user_id] };
}

function canAccessSensor(req, sensorRow) {
  if (!sensorRow) return false;
  if (req.user.role === 'admin') return true;
  return sensorRow.user_id !== null && Number(sensorRow.user_id) === Number(req.user.user_id);
}

function generateDeviceKey() {
  return 'pg_' + crypto.randomBytes(24).toString('hex');
}

function hashKey(key) {
  return crypto.createHash('sha256').update(String(key)).digest('hex');
}

function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

async function defaultThreshold() {
  const [rows] = await db.query(
    'SELECT setting_value FROM system_settings WHERE setting_key = ?',
    ['moisture_threshold']
  );
  return rows.length > 0 ? parseFloat(rows[0].setting_value) : DEFAULT_THRESHOLD;
}

async function thresholdFor(userId) {
  if (userId !== null && userId !== undefined) {
    const [rows] = await db.query('SELECT moisture_threshold FROM users WHERE user_id = ?', [userId]);
    if (rows.length > 0 && rows[0].moisture_threshold !== null) {
      return { value: parseFloat(rows[0].moisture_threshold), custom: true };
    }
  }
  return { value: await defaultThreshold(), custom: false };
}

const ALERT_COOLDOWN = {
  'Low Moisture': 30 * 60 * 1000,
  'Critical Moisture Drop': 30 * 60 * 1000,
  'Overwatering Detected': 5 * 60 * 1000,
  'Overwatering Risk — Open Drainage': 60 * 60 * 1000,
  'Overwatering Risk — Prepare Drainage': 60 * 60 * 1000,
};

// Per-sensor cooldown, read from the database
async function cooldownActive(sensorId, alertType) {
  const cooldown = ALERT_COOLDOWN[alertType];
  if (!cooldown) return false;
  const [rows] = await db.query(
    'SELECT MAX(sent_at) AS last_sent FROM alert_notification WHERE sensor_id = ? AND alert_type = ?',
    [sensorId, alertType]
  );
  const last = rows[0] && rows[0].last_sent;
  if (!last) return false;
  return Date.now() - new Date(last).getTime() < cooldown;
}

module.exports = {
  DEFAULT_THRESHOLD, sensorScope, canAccessSensor, generateDeviceKey,
  hashKey, safeEqualHex, defaultThreshold, thresholdFor, cooldownActive,
};