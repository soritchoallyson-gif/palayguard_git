CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('farmer', 'admin') DEFAULT 'farmer',
  full_name VARCHAR(150),
  contact_number VARCHAR(20),
  location VARCHAR(200),
  created_at DATETIME DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensors (
  sensor_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  device_name VARCHAR(100),
  location_description VARCHAR(200),
  status VARCHAR(50) DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS soil_moisture (
  reading_id INT AUTO_INCREMENT PRIMARY KEY,
  sensor_id INT,
  moisture_value FLOAT,
  timestamp DATETIME DEFAULT NOW(),
  FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
);

CREATE TABLE IF NOT EXISTS alert_notification (
  alert_id INT AUTO_INCREMENT PRIMARY KEY,
  sensor_id INT,
  user_id INT,
  alert_type VARCHAR(100),
  moisture_value FLOAT,
  status ENUM('critical','pending','acknowledged','resolved') DEFAULT 'critical',
  sent_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,railway
  user_id INT,
  subscription_data TEXT,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- INSERT TEST USERS
-- Note: passwords will be properly hashed when you run seed.js
-- Temporary plain passwords here just to create the records
-- ============================================================

INSERT INTO users (username, password, role, full_name, contact_number, location) VALUES
('farmer1', 'temp_will_be_hashed', 'farmer', 'Archibald Temporaza', '09XX-XXX-XXXX', 'San Narciso'),
('admin', 'temp_will_be_hashed', 'admin', 'Pearl Logic Admin', '09XX-XXX-XXXX', 'Gordon College');

-- ============================================================
-- INSERT TEST SENSORS
-- ============================================================

INSERT INTO sensors (user_id, device_name, location_description, status) VALUES
(1, 'Sensor 1', 'Zone A - North Field', 'active'),
(1, 'Sensor 2', 'Zone B - South Field', 'active');

-- ============================================================
-- INSERT SAMPLE MOISTURE READINGS (for testing the dashboard)
-- ============================================================

INSERT INTO soil_moisture (sensor_id, moisture_value, timestamp) VALUES
(1, 82.5, NOW() - INTERVAL 50 MINUTE),
(2, 39.2, NOW() - INTERVAL 45 MINUTE),
(1, 80.1, NOW() - INTERVAL 40 MINUTE),
(2, 37.8, NOW() - INTERVAL 35 MINUTE),
(1, 78.9, NOW() - INTERVAL 30 MINUTE),
(2, 35.5, NOW() - INTERVAL 25 MINUTE),
(1, 76.4, NOW() - INTERVAL 20 MINUTE),
(2, 33.1, NOW() - INTERVAL 15 MINUTE),
(1, 74.2, NOW() - INTERVAL 10 MINUTE),
(2, 31.6, NOW() - INTERVAL 5 MINUTE),
(1, 72.8, NOW()),
(2, 29.4, NOW());

-- ============================================================
-- INSERT SAMPLE ALERTS (for testing the alerts page)
-- ============================================================

INSERT INTO alert_notification (sensor_id, user_id, alert_type, moisture_value, status, sent_at) VALUES
(2, 1, 'Critical Moisture Drop', 29.4, 'critical', NOW()),
(2, 1, 'Low Moisture', 33.1, 'acknowledged', NOW() - INTERVAL 15 MINUTE),
(2, 1, 'Low Moisture', 35.5, 'resolved', NOW() - INTERVAL 5 HOUR),
(1, 1, 'Critical Moisture Drop', 31.0, 'critical', NOW() - INTERVAL 15 HOUR),
(2, 1, 'Low Moisture', 37.8, 'pending', NOW() - INTERVAL 1 DAY);