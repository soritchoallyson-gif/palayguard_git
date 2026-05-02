const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const db = require('../db');
const auth = require('../middleware/authMiddleware');
require('dotenv').config();

const vapidKeys = webpush.generateVAPIDKeys();

webpush.setVapidDetails(
  'mailto:palayguard@gordon.edu.ph',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

global.VAPID_PUBLIC_KEY = vapidKeys.publicKey;

global.sendPushToAll = async (payload) => {
  try {
    const [subs] = await db.query('SELECT * FROM push_subscriptions');
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription_data),
          JSON.stringify(payload)
        );
      } catch {}
    }
  } catch {}
};

router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: global.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', auth, async (req, res) => {
  const { subscription } = req.body;
  try {
    await db.query(
      'INSERT INTO push_subscriptions (user_id, subscription_data) VALUES (?, ?)',
      [req.user.user_id, JSON.stringify(subscription)]
    );
    res.json({ message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;