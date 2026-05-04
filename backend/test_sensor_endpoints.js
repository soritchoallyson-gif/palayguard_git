#!/usr/bin/env node

/**
 * PalayGuard Backend Test Script
 * Tests all sensor data endpoints and database connectivity
 * 
 * Run: node test_sensor_endpoints.js
 */

const http = require('http');
const db = require('./db');
require('dotenv').config();

const API_KEY = process.env.ARDUINO_API_KEY;
const BACKEND_URL = `http://localhost:${process.env.PORT || 3001}`;

let testsPassed = 0;
let testsFailed = 0;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(type, message) {
  const prefix = {
    '✓': `${colors.green}✓${colors.reset}`,
    '✗': `${colors.red}✗${colors.reset}`,
    '⚠': `${colors.yellow}⚠${colors.reset}`,
    'ℹ': `${colors.cyan}ℹ${colors.reset}`
  }[type] || type;
  
  console.log(`${prefix} ${message}`);
}

async function makeRequest(method, path, data = null, apiKey = API_KEY) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (apiKey) {
      options.headers['x-api-key'] = apiKey;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDatabaseConnection() {
  console.log(`\n${colors.cyan}=== Testing Database Connection ===${colors.reset}`);
  
  try {
    const [rows] = await db.query('SELECT 1 as test');
    if (rows && rows.length > 0) {
      log('✓', 'Database connection successful');
      testsPassed++;
    }
  } catch (err) {
    log('✗', `Database connection failed: ${err.message}`);
    testsFailed++;
  }
}

async function testSensorTable() {
  console.log(`\n${colors.cyan}=== Testing Sensor Table Schema ===${colors.reset}`);
  
  try {
    const [columns] = await db.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'soil_moisture' AND TABLE_SCHEMA = 'palayguard'`
    );
    
    const columnNames = columns.map(c => c.COLUMN_NAME);
    const requiredColumns = ['sensor_id', 'moisture_value', 'temperature', 'humidity', 'timestamp'];
    
    let allFound = true;
    for (const col of requiredColumns) {
      if (columnNames.includes(col)) {
        log('✓', `Column '${col}' exists`);
        testsPassed++;
      } else {
        log('✗', `Column '${col}' missing`);
        testsFailed++;
        allFound = false;
      }
    }
    
    if (!allFound) {
      log('⚠', 'Run migration: backend/migrations/001_add_temperature_humidity.sql');
    }
  } catch (err) {
    log('✗', `Failed to check schema: ${err.message}`);
    testsFailed++;
  }
}

async function testEnvironmentVariables() {
  console.log(`\n${colors.cyan}=== Testing Environment Variables ===${colors.reset}`);
  
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'ARDUINO_API_KEY', 'MOISTURE_THRESHOLD'];
  
  for (const env of required) {
    if (process.env[env]) {
      const value = env === 'ARDUINO_API_KEY' 
        ? `${process.env[env].substring(0, 5)}***`
        : process.env[env];
      log('✓', `${env} = ${value}`);
      testsPassed++;
    } else {
      log('✗', `${env} not set in .env file`);
      testsFailed++;
    }
  }
}

async function testSensorDataEndpoint() {
  console.log(`\n${colors.cyan}=== Testing Sensor Data Endpoint ===${colors.reset}`);
  
  // Get a valid sensor_id from database
  try {
    const [sensors] = await db.query('SELECT sensor_id FROM sensors LIMIT 1');
    
    if (sensors.length === 0) {
      log('⚠', 'No sensors in database. Insert one first:');
      log('ℹ', 'INSERT INTO sensors (user_id, device_name, status) VALUES (1, "Test Sensor", "active");');
      return;
    }
    
    const sensor_id = sensors[0].sensor_id;
    
    // Test 1: Valid request
    log('ℹ', `Testing with sensor_id = ${sensor_id}`);
    
    const testData = {
      sensor_id: sensor_id,
      moisture: 45.5,
      temperature: 25.3,
      humidity: 65.0
    };
    
    try {
      const response = await makeRequest('POST', '/api/sensors/data', testData);
      
      if (response.status === 200) {
        log('✓', `Valid request accepted (HTTP 200)`);
        testsPassed++;
      } else {
        log('✗', `Expected 200, got ${response.status}`);
        log('ℹ', `Response: ${JSON.stringify(response.body)}`);
        testsFailed++;
      }
    } catch (err) {
      log('✗', `Request failed: ${err.message}`);
      testsFailed++;
    }
    
    // Test 2: Invalid API key
    const invalidResponse = await makeRequest(
      'POST', 
      '/api/sensors/data', 
      testData, 
      'wrong_api_key'
    );
    
    if (invalidResponse.status === 401) {
      log('✓', `Invalid API key rejected (HTTP 401)`);
      testsPassed++;
    } else {
      log('✗', `Invalid API key not properly rejected (HTTP ${invalidResponse.status})`);
      testsFailed++;
    }
    
    // Test 3: Missing fields
    const incompleteData = {
      sensor_id: sensor_id
      // moisture missing
    };
    
    const incompleteResponse = await makeRequest('POST', '/api/sensors/data', incompleteData);
    
    if (incompleteResponse.status === 400) {
      log('✓', `Missing required field rejected (HTTP 400)`);
      testsPassed++;
    } else {
      log('✗', `Missing field not properly rejected (HTTP ${incompleteResponse.status})`);
      testsFailed++;
    }
    
    // Test 4: Invalid moisture value
    const invalidData = {
      sensor_id: sensor_id,
      moisture: 999  // Out of range
    };
    
    const invalidDataResponse = await makeRequest('POST', '/api/sensors/data', invalidData);
    
    if (invalidDataResponse.status === 400) {
      log('✓', `Invalid moisture value rejected (HTTP 400)`);
      testsPassed++;
    } else {
      log('✗', `Invalid value not properly rejected (HTTP ${invalidDataResponse.status})`);
      testsFailed++;
    }
    
  } catch (err) {
    log('✗', `Test failed: ${err.message}`);
    testsFailed++;
  }
}

async function testDatabaseStorage() {
  console.log(`\n${colors.cyan}=== Testing Data Storage ===${colors.reset}`);
  
  try {
    const [readings] = await db.query(
      'SELECT * FROM soil_moisture ORDER BY timestamp DESC LIMIT 5'
    );
    
    if (readings.length > 0) {
      log('✓', `Database has ${readings.length} readings`);
      
      // Check if temperature/humidity columns have data
      const hasTemp = readings[0].temperature !== null;
      const hasHumidity = readings[0].humidity !== null;
      
      log('ℹ', `Recent reading: moisture=${readings[0].moisture_value}%, temp=${readings[0].temperature}, humidity=${readings[0].humidity}`);
      
      if (hasTemp && hasHumidity) {
        log('✓', 'Temperature and humidity columns are populated');
        testsPassed++;
      } else {
        log('⚠', 'Temperature/humidity columns exist but are empty (Arduino may not be sending them)');
      }
      testsPassed++;
    } else {
      log('⚠', 'No readings in database yet. Arduino hasn\'t sent data yet.');
      log('ℹ', 'This is normal if Arduino just started. Check back in 60 seconds.');
    }
  } catch (err) {
    log('✗', `Failed to check storage: ${err.message}`);
    testsFailed++;
  }
}

async function testAlertSystem() {
  console.log(`\n${colors.cyan}=== Testing Alert System ===${colors.reset}`);
  
  try {
    const threshold = parseFloat(process.env.MOISTURE_THRESHOLD || 40);
    log('ℹ', `Moisture threshold is set to ${threshold}%`);
    
    const [alerts] = await db.query(
      'SELECT COUNT(*) as count FROM alert_notification'
    );
    
    log('ℹ', `Total alerts in system: ${alerts[0].count}`);
    testsPassed++;
  } catch (err) {
    log('✗', `Failed to check alerts: ${err.message}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║     PalayGuard Sensor Data System Test Suite         ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`);
  
  // Run tests
  await testEnvironmentVariables();
  await testDatabaseConnection();
  await testSensorTable();
  await testSensorDataEndpoint();
  await testDatabaseStorage();
  await testAlertSystem();
  
  // Summary
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}✓ Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${testsFailed}${colors.reset}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}All tests passed! Your system is ready for Arduino sensors.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}Some tests failed. Check the errors above and run the appropriate fixes.${colors.reset}`);
  }
  
  process.exit(testsFailed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});
