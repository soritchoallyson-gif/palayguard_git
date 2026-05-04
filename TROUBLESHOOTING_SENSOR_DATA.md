# PalayGuard - Arduino Sensor Data Troubleshooting Guide

## Summary of Fixes Made

### 1. **Database Schema Updated** ✅
   - Added missing `temperature` and `humidity` columns to `soil_moisture` table
   - Added indexing for faster queries
   - **Action**: Run migration to update your database:
     ```sql
     ALTER TABLE soil_moisture ADD COLUMN temperature FLOAT;
     ALTER TABLE soil_moisture ADD COLUMN humidity FLOAT;
     CREATE INDEX idx_sensor_timestamp ON soil_moisture(sensor_id, timestamp DESC);
     ```

### 2. **API Key System Fixed** ✅
   - **Problem**: Was using `JWT_SECRET` (complex 64+ char string) for Arduino API validation
   - **Solution**: Use new `ARDUINO_API_KEY` environment variable with a simple key
   - **Action**: 
     ```bash
     # In your .env file:
     ARDUINO_API_KEY=simple_api_key_123
     ```

### 3. **Input Validation Added** ✅
   - Validates moisture is 0-100%
   - Validates temperature is -50°C to 60°C
   - Validates humidity is 0-100%
   - Rejects invalid sensor IDs
   - **Benefits**: Prevents corrupt data from being stored; Arduino knows when to retry

### 4. **Better Error Messages** ✅
   - Returns specific error codes (400, 401, 404, 500)
   - Tells Arduino WHY the request failed
   - Logs errors to backend console
   - **Benefits**: Easier debugging

---

## Causes of "Stuck" and Inaccurate Data

### 🔴 **Problem 1: Silent Database Failures**
Arduino sends data, but database fails silently because columns don't exist.
Arduino doesn't know it failed, so doesn't retry.

**Solution**: Updated schema with missing columns ✅

---

### 🔴 **Problem 2: API Key Too Complex**
Using JWT_SECRET (example: `eyJhbGciOiJIUzI1NiIs...`) is problematic for Arduino:
- Hard to transmit reliably
- More likely to have typos
- Difficult to update

**Solution**: Use simple `ARDUINO_API_KEY=sensor123` ✅

---

### 🔴 **Problem 3: No Data Validation**
Backend accepts ANY value as moisture:
- Maybe sensor sends `99999` due to malfunction
- Maybe network corruption changes `50` to `500`
- Bad data gets stored

**Solution**: Validate all inputs before storing ✅

---

### 🔴 **Problem 4: Noise in Analog Readings**
Raw ADC values from analog sensors jitter constantly.
If Arduino sends raw values every second, you get inconsistent readings.

**Solution**: Arduino sketch now includes moving average filter:
```cpp
// Average 10 readings to smooth out noise
const int READINGS = 10;
int smoothedValue = readingSum / READINGS;
```

---

### 🔴 **Problem 5: Sensor Calibration**
Moisture sensors need calibration:
- Dry soil = raw ADC value `500`
- Wet soil = raw ADC value `4095`
- Without proper mapping, readings are inaccurate

**Solution**: Arduino sketch shows how to calibrate:
```cpp
int minValue = 500;   // Adjust based on YOUR sensor
int maxValue = 4095;  // Adjust based on YOUR sensor
float moisture = map(smoothedValue, minValue, maxValue, 0, 100);
```

---

## Setup Instructions

### Step 1: Update Backend Environment
```bash
cd backend
cp .env.example .env
# Edit .env:
ARDUINO_API_KEY=your_simple_key_here  # Use something like: palay123
```

### Step 2: Update Database
```bash
# Run the migration SQL
mysql -u root -p palayguard < migration.sql
```

Or manually run:
```sql
ALTER TABLE soil_moisture ADD COLUMN temperature FLOAT;
ALTER TABLE soil_moisture ADD COLUMN humidity FLOAT;
CREATE INDEX idx_sensor_timestamp ON soil_moisture(sensor_id, timestamp DESC);
```

### Step 3: Configure Arduino
1. Open `Arduino_Sketch_Example.ino` in Arduino IDE
2. Change these constants:
   ```cpp
   const char* SSID = "YOUR_WIFI_SSID";
   const char* PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* BACKEND_URL = "http://192.168.1.XXX:3001/api/sensors/data";
   const char* API_KEY = "your_simple_key_here";  // Must match ARDUINO_API_KEY
   const int SENSOR_ID = 1;  // Change for each Arduino
   ```

3. Calibrate moisture sensor:
   ```cpp
   int minValue = 500;   // Dip sensor in DRY soil, note raw ADC value
   int maxValue = 4095;  // Dip sensor in WET soil, note raw ADC value
   ```

4. Upload sketch to Arduino

### Step 4: Test Connection
1. Open Arduino Serial Monitor (115200 baud)
2. You should see:
   ```
   WiFi connected!
   IP address: 192.168.1.100
   
   --- Reading Sensors ---
   Raw ADC: 2500 -> Moisture: 45.50%
   --- Preparing to send data ---
   Payload: {"sensor_id":1,"moisture":45.50}
   HTTP Response Code: 200
   ✅ Data sent successfully!
   ```

---

## Debugging Checklist

### ❌ "WiFi disconnected" messages
- [ ] Check WiFi SSID and password
- [ ] Check 2.4GHz vs 5GHz (some Arduinos don't support 5GHz)
- [ ] Check signal strength near Arduino location
- [ ] Verify router allows IoT devices to connect

### ❌ "Unauthorized" error (HTTP 401)
- [ ] Check `API_KEY` in Arduino matches `ARDUINO_API_KEY` in `.env`
- [ ] Make sure `.env` file exists in `backend/` folder
- [ ] Restart backend server after updating `.env`
- [ ] Check for extra spaces in `API_KEY`

### ❌ "Sensor not found" error (HTTP 404)
- [ ] Check `SENSOR_ID` in Arduino matches a record in database:
  ```sql
  SELECT * FROM sensors;
  ```
- [ ] If not found, insert test sensor:
  ```sql
  INSERT INTO sensors (user_id, device_name, status) VALUES (1, 'Sensor 1', 'active');
  ```

### ❌ "Bad request" error (HTTP 400)
- [ ] Check moisture value is 0-100%
- [ ] Check temperature is -50 to 60°C (if sending)
- [ ] Check JSON formatting in Serial output
- [ ] Ensure `sensor_id` is a number, not a string

### ❌ Moisture readings stuck at same value
- [ ] Check sensor is physically in soil
- [ ] Try moving sensor around to verify it changes
- [ ] Check ADC wiring (usually A0 pin)
- [ ] Test with different `SEND_INTERVAL` (longer intervals get more stable readings)

### ❌ Moisture readings way off (like 999% or -50%)
- [ ] **Calibrate sensor!** Update `minValue` and `maxValue`
- [ ] Serial Monitor should show raw ADC values:
  ```
  Raw ADC: 2500 -> Moisture: 45.50%
  ```
- [ ] In dry soil, raw ADC should be ~500
- [ ] In wet soil, raw ADC should be ~3500-4095
- [ ] Adjust constants based on your sensor

### ❌ Backend not receiving any data
1. Check backend logs:
   ```bash
   npm run dev
   # Should show:
   # --- Incoming Arduino Data ---
   ```

2. Test with curl from Windows PowerShell:
   ```powershell
   $headers = @{
     "x-api-key" = "your_simple_key_here"
     "Content-Type" = "application/json"
   }
   $body = @{
     "sensor_id" = 1
     "moisture" = 50.5
     "temperature" = 25.3
     "humidity" = 65.0
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3001/api/sensors/data" `
     -Method POST -Headers $headers -Body $body
   ```

3. If curl works but Arduino doesn't:
   - Check Arduino can reach backend IP/port
   - Try pinging backend from Arduino network
   - Check firewall rules

---

## Expected Behavior After Fixes

✅ **Arduino sends data every 60 seconds** (configurable)
✅ **Backend responds with 200 status**
✅ **Backend logs show "✅ Data saved successfully"**
✅ **Data appears in database** (check with SQL SELECT)
✅ **Frontend Dashboard shows latest readings**
✅ **Alerts trigger when moisture < threshold**

---

## Recommended Hardware Setup

### Moisture Sensor
- **Type**: Capacitive soil moisture sensor (more reliable than resistive)
- **Output**: Analog (0-3.3V or 0-5V)
- **Connection**: A0 pin on Arduino
- **Accuracy**: ±3-5% with calibration

### Arduino Board
- **Recommended**: ESP32 (built-in WiFi)
- **Alternative**: Arduino + WiFi Shield
- **Power**: 5V USB or battery with voltage regulator

### Wiring Example
```
Moisture Sensor VCC  → Arduino 5V
Moisture Sensor GND  → Arduino GND
Moisture Sensor AO   → Arduino A0 (ADC)
DHT22 Data           → Arduino D4 (optional)
```

---

## Performance Optimization

### If readings are still noisy:
- Increase `READINGS` from 10 to 20
- Increase `SEND_INTERVAL` from 60000ms to 120000ms

### If Arduino uses too much power:
- Increase `SEND_INTERVAL` to 300000ms (5 minutes)
- Add deep sleep between readings (see Arduino sleep documentation)

### If WiFi keeps disconnecting:
- Add WiFi reconnection logic in loop()
- Check antenna placement
- Use 2.4GHz only (5GHz is slower)

---

## Database Recovery

If you need to reset test data:
```sql
-- Delete old test data
DELETE FROM alert_notification;
DELETE FROM soil_moisture;

-- Re-run seed script
node backend/seed.js
```

---

## Questions?

Check the Arduino Serial Monitor first - it will tell you exactly what's wrong!

Serial output like "❌ Unauthorized! Check API_KEY" is much more helpful than guessing.
