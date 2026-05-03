const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/authMiddleware');
require('dotenv').config();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, role: user.role, full_name: user.full_name, user_id: user.user_id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin only — get all users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, username, full_name, role, contact_number, location, created_at FROM users'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin only — create new user
router.post('/register', auth, adminOnly, async (req, res) => {
  const { username, password, full_name, role, contact_number, location } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password, full_name, role, contact_number, location) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashed, full_name, role || 'farmer', contact_number, location]
    );
    res.json({ message: 'User created successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin only — delete user
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;