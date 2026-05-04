# Arduino Sensor Data - Quick Fix Summary

## 🔴 Root Causes Found

1. **Database Schema Missing Columns** - Backend tries to insert `temperature` and `humidity` but columns don't exist → silent database failures
2. **API Key Validation Error** - Used complex `JWT_SECRET` instead of simple `ARDUINO_API_KEY` → authentication issues
3. **No Input Validation** - Bad data gets stored without verification → inaccurate readings
4. **No Error Feedback** - Arduino doesn't know when it fails → data gets stuck
5. **No Noise Filtering** - Raw sensor readings are jittery → inaccurate values

---

## ✅ Solutions Implemented

| Issue | Fix | Files Changed |
|-------|-----|---------------|
| Missing DB columns | Added temperature, humidity columns + index | `palayguard.sql` |
| API key validation | New `ARDUINO_API_KEY` environment variable | `backend/routes/sensors.js` |
| No validation | Added range checks (moisture 0-100%, temp -50-60°C) | `backend/routes/sensors.js` |
| Poor error messages | Detailed error codes and logging | `backend/routes/sensors.js` |
| Sensor noise | Moving average filter (10-point smoothing) | `Arduino_Sketch_Example.ino` |

---

## 🚀 Quick Setup (5 minutes)

### 1. Update Database
```bash
# Option A: MySQL command line
mysql -u root -p palayguard < backend/migrations/001_add_temperature_humidity.sql

# Option B: Paste into your MySQL client
ALTER TABLE soil_moisture ADD COLUMN temperature FLOAT;
ALTER TABLE soil_moisture ADD COLUMN humidity FLOAT;
CREATE INDEX idx_sensor_timestamp ON soil_moisture(sensor_id, timestamp DESC);
```

### 2. Update Backend .env
```bash
cd backend
# Edit .env - change this line:
ARDUINO_API_KEY=your_simple_key_here
# Example: ARDUINO_API_KEY=palayguard_sensor_123
```

### 3. Configure Arduino
Edit `Arduino_Sketch_Example.ino`:
```cpp
const char* SSID = "YOUR_WIFI_SSID";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL = "http://192.168.1.XXX:3001/api/sensors/data";
const char* API_KEY = "palayguard_sensor_123";  // Same as ARDUINO_API_KEY
const int SENSOR_ID = 1;  // From your database
```

Calibrate sensor (important!):
```cpp
// Test with ACTUAL soil:
int minValue = 500;   // Dry soil ADC value
int maxValue = 4095;  // Wet soil ADC value
```

### 4. Upload & Test
- Upload sketch to Arduino
- Open Serial Monitor (115200 baud)
- Should show: `✅ Data sent successfully!`

---

## 📋 What to Check First

### If still not working:

1. **Check Backend Logs**
   ```bash
   npm run dev
   # Should show: --- Incoming Arduino Data ---
   ```

2. **Test with PowerShell** (from Windows):
   ```powershell
   $headers = @{
     "x-api-key" = "palayguard_sensor_123"
     "Content-Type" = "application/json"
   }
   $body = '{"sensor_id":1,"moisture":50.5}' | ConvertTo-Json
   
   Invoke-WebRequest -Uri "http://localhost:3001/api/sensors/data" `
     -Method POST -Headers $headers -Body $body -ContentType "application/json"
   ```

3. **Check Database**
   ```sql
   SELECT * FROM soil_moisture ORDER BY timestamp DESC LIMIT 10;
   SELECT * FROM sensors;  -- Make sure sensor_id 1 exists
   ```

4. **Arduino Serial Monitor** (most helpful)
   - Shows connection status
   - Shows exact error messages
   - Shows sensor readings

---

## 📚 Documentation Files

- **`TROUBLESHOOTING_SENSOR_DATA.md`** - Comprehensive debugging guide
- **`Arduino_Sketch_Example.ino`** - Complete working Arduino code with comments
- **`backend/.env.example`** - Environment variable template
- **`backend/migrations/001_add_temperature_humidity.sql`** - Database migration

---

## 🎯 Expected Results

After fixes:
- ✅ Arduino connects to WiFi and backend
- ✅ Sensor data sent every 60 seconds
- ✅ Backend returns HTTP 200 status
- ✅ Data stored in database with correct columns
- ✅ Frontend displays accurate, smooth readings
- ✅ Alerts trigger when moisture drops below threshold

---

## 💡 Key Insight

The "stuck" data was likely **silent database failures**. The backend code was trying to insert into non-existent columns, failing silently, and Arduino had no way to know it should retry.

Now Arduino gets clear feedback:
- ✅ 200 = success
- ❌ 401 = wrong API key
- ❌ 404 = sensor not found
- ❌ 400 = invalid data

---

## ⚡ Pro Tips

1. **Calibration is Critical** - Most inaccurate readings are due to wrong min/max values
2. **Monitor Serial Output** - Serial Monitor is your debugging best friend
3. **Start Simple** - Send just moisture first, add temperature/humidity later
4. **Increase Send Interval if Needed** - Every 60 seconds is good, but you can do 5 minutes
5. **Check WiFi Signal** - Poor signal causes data loss and "stuck" appearance

---

## 🆘 Need Help?

1. Check Serial Monitor output first (most detailed)
2. Read `TROUBLESHOOTING_SENSOR_DATA.md`
3. Enable verbose logging in backend
4. Test with PowerShell curl command to isolate the issue
