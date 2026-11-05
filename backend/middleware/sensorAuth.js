require('dotenv').config();

const sensorAuth = (req, res, next) => {
  const received = req.headers['x-api-key'];
  const expected = process.env.ARDUINO_API_KEY;

  if (!expected) {
    console.error('ARDUINO_API_KEY is not set');
    return res.status(500).json({ message: 'Server misconfigured' });
  }

  if (!received || received.trim() !== expected.trim()) {
    return res.status(401).json({ message: 'Unauthorized API Key' });
  }
  next();
};

module.exports = sensorAuth;
