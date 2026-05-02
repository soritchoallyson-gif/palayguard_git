const axios = require('axios');
const db = require('../db');
require('dotenv').config();

// ThingSpeak settings from your friend's Arduino code
const THINGSPEAK_CHANNEL_ID = '3359906'; // get this from the URL in the chart photo
const THINGSPEAK_API_KEY = 'B2FQS08D4YWXCW6J';
const THINGSPEAK_READ_URL = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds/last.json?api_key=${THINGSPEAK_API_KEY}`;

let lastEntryId = null; // tracks the last reading we saved so we don't duplicate

async function fetchFromThingSpeak() {
  try {
    const response = await axios.get(THINGSPEAK_READ_URL);
    const data = response.data;

    // Skip if no data or same entry as last time
    if (!data || !data.field1 || data.entry_id === lastEntryId) {
      return;
    }

    lastEntryId = data.entry_id;
    const moisture = parseFloat(data.field1);
    const sensor_id = 1; // your friend's code uses one sensor

    console.log(`ThingSpeak data received — Sensor ${sensor_id}: ${moisture}%`);

    // Save to database
    await db.query(
      'INSERT INTO soil_moisture (sensor_id, moisture_value) VALUES (?, ?)',
      [sensor_id, moisture]
    );

    // Check threshold and create alert if needed
    const threshold = parseFloat(process.env.MOISTURE_THRESHOLD || 40);

    if (moisture < threshold) {
      const [sensor] = await db.query(
        'SELECT user_id FROM sensors WHERE sensor_id = ?',
        [sensor_id]
      );

      if (sensor.length > 0) {
        const alertType = moisture < 20 ? 'Critical Moisture Drop' : 'Low Moisture';
        const alertStatus = moisture < 20 ? 'critical' : 'pending';

        await db.query(
          `INSERT INTO alert_notification
           (sensor_id, user_id, alert_type, moisture_value, status)
           VALUES (?, ?, ?, ?, ?)`,
          [sensor_id, sensor[0].user_id, alertType, moisture, alertStatus]
        );

        console.log(`ALERT created — ${alertType} at ${moisture}%`);

        if (global.sendPushToAll) {
          await global.sendPushToAll({
            title: 'PalayGuard Alert 🌾',
            body: `Moisture is at ${moisture}%. Time to irrigate!`,
            icon: '/logo192.png',
          });
        }
      }
    }
  } catch (err) {
    console.log('ThingSpeak fetch error:', err.message);
  }
}

function startSerialReader() {
  console.log('Starting ThingSpeak data polling...');
  console.log('Fetching moisture data every 20 seconds from ThingSpeak');

  // Fetch immediately on start
  fetchFromThingSpeak();

  // Then fetch every 20 seconds (matches Arduino delay)
  setInterval(fetchFromThingSpeak, 20000);
}

module.exports = { startSerialReader };