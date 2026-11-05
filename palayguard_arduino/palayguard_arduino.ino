#include <HTTPClient.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <esp_sleep.h>

// ===================== BACKEND =====================
#define HOST "palayguardgit-production.up.railway.app"      // backend address: PC's IPv4 (http) or domain (https)
#define PORT 3001       // used only when USE_HTTPS is false
#define USE_HTTPS true // true if the backend is hosted online with https
#define API_KEY "palayguard_sensor_key_2026"
#define SENSOR_ID 1

// ===================== SENSOR ======================
#ifndef SENSOR_PIN
#ifdef D0
#define SENSOR_PIN D0
#else
#define SENSOR_PIN 1 // Default GPIO for XIAO ESP32-C5 D0 (ADC)
#endif
#endif

#ifndef POWER_PIN
#ifdef D1
#define POWER_PIN D1
#else
#define POWER_PIN 2 // Default GPIO for XIAO ESP32-C5 D1 (Power)
#endif
#endif

#define DRY_VAL 2207   // recalibrate: raw value with sensor in air
#define WET_VAL 3800 // recalibrate: raw value with sensor in water

// ===================== TIMING ======================
#define TEST_MODE true // true = stay awake (USB), false = deep sleep (field)
#define TEST_INTERVAL_S 30         // seconds between sends in test mode
#define SLEEP_MIN 10               // minutes between sends in normal mode
#define RETRY_MIN 1                // minutes before retrying after a failure
#define PORTAL_TIMEOUT_MS 180000UL // how long the setup hotspot stays open

#define CLEAR_BTN 28 // BOOT button on the XIAO ESP32-C5 (GPIO28)

Preferences prefs;
WebServer server(80);
String networkOptions = "";
bool portalSaved = false;

// ------------------------------------------------------------
// Serial input helper (used by the test-mode menu)
// ------------------------------------------------------------
bool readLine(String &out, unsigned long timeoutMs) {
  unsigned long start = millis();
  out = "";
  while (millis() - start < timeoutMs) {
    while (Serial.available()) {
      char c = Serial.read();
      if (c == '\n' || c == '\r') {
        if (out.length()) {
          // Discard immediate paired CRLF/LFCR delimiter
          delay(5);
          if (Serial.available()) {
            char nextChar = Serial.peek();
            if (nextChar == '\n' || nextChar == '\r') {
              Serial.read();
            }
          }
          return true;
        }
      } else {
        out += c;
      }
    }
    delay(10);
  }
  return false;
}

// ------------------------------------------------------------
// Wi-Fi basics
// ------------------------------------------------------------
bool joinNetwork(const String &ssid, const String &pass) {
  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid.c_str(), pass.c_str());
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++)
    delay(500);
  return WiFi.status() == WL_CONNECTED;
}

void saveNetwork(const String &ssid, const String &pass) {
  prefs.begin("wifi", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
}

void forgetNetwork() {
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();
  WiFi.disconnect(true, true); // also erase the Wi-Fi library's own saved copy
  delay(500);
  WiFi.mode(WIFI_STA);
  Serial.println("Saved Wi-Fi cleared.");
}

bool trySaved() {
  prefs.begin("wifi", true);
  String ssid = prefs.getString("ssid", "");
  String pass = prefs.getString("pass", "");
  prefs.end();
  if (ssid == "") {
#ifdef DEFAULT_WIFI_SSID
    ssid = DEFAULT_WIFI_SSID;
    pass = DEFAULT_WIFI_PASS;
    Serial.println("Using default Wi-Fi: " + ssid);
    return joinNetwork(ssid, pass);
#else
    Serial.println("No saved network.");
    return false;
#endif
  }
  Serial.println("Trying saved network: " + ssid);
  bool ok = joinNetwork(ssid, pass);
#ifdef DEFAULT_WIFI_SSID
  if (!ok && ssid != DEFAULT_WIFI_SSID) {
    Serial.println("Saved Wi-Fi failed. Falling back to: " +
                   String(DEFAULT_WIFI_SSID));
    ok = joinNetwork(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASS);
    if (ok) {
      saveNetwork(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASS);
      Serial.println("Updated saved Wi-Fi to: " + String(DEFAULT_WIFI_SSID));
    }
  }
#endif
  return ok;
}

// ------------------------------------------------------------
// Option A: numbered menu in the Serial Monitor (TEST_MODE)
// ------------------------------------------------------------
bool chooseNetwork() {
  for (int attempt = 0; attempt < 3; attempt++) {
    WiFi.disconnect();
    delay(300);
    Serial.println("\nScanning...");
    int n = WiFi.scanNetworks();
    Serial.printf("Networks found: %d\n", n);
    if (n <= 0) {
      Serial.println("None found. Is the antenna attached?");
      delay(3000);
      continue;
    }
    for (int i = 0; i < n; i++) {
      Serial.printf("%d: %s (%d dBm)%s\n", i + 1, WiFi.SSID(i).c_str(),
                    WiFi.RSSI(i),
                    WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? " [open]" : "");
    }

    Serial.println("Type the network number and press Enter (0 = rescan):");
    String s;
    if (!readLine(s, 60000)) {
      Serial.println("No input.");
      return false;
    }
    int choice = s.toInt();
    if (choice < 1 || choice > n)
      continue;

    String ssid = WiFi.SSID(choice - 1);
    bool isOpen = WiFi.encryptionType(choice - 1) == WIFI_AUTH_OPEN;
    String pass = "";
    if (!isOpen) {
      Serial.println("Password for " + ssid + ":");
      if (!readLine(pass, 60000)) {
        Serial.println("No input.");
        return false;
      }
    }

    Serial.println("Connecting...");
    if (joinNetwork(ssid, pass)) {
      saveNetwork(ssid, pass);
      Serial.println("Connected and saved.");
      return true;
    }
    Serial.println("Failed. Wrong password?");
  }
  return false;
}

// ------------------------------------------------------------
// Option B: phone setup page (field use, no PC needed)
// ------------------------------------------------------------
String htmlEscape(const String &s) {
  String o = "";
  for (unsigned int i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '&')
      o += "&amp;";
    else if (c == '<')
      o += "&lt;";
    else if (c == '>')
      o += "&gt;";
    else if (c == '"')
      o += "&quot;";
    else
      o += c;
  }
  return o;
}

void handleRoot() {
  String html =
      "<!DOCTYPE html><html><head><meta name='viewport' "
      "content='width=device-width,initial-scale=1'><title>PalayGuard "
      "Setup</title></head>"
      "<body style='font-family:sans-serif;padding:16px'>"
      "<h2>PalayGuard Wi-Fi setup</h2>"
      "<form action='/save' method='POST'>"
      "<label>Network</label><br>"
      "<select name='ssid' style='width:100%;padding:8px'>" +
      networkOptions +
      "</select>"
      "<br><br><label>Password</label><br>"
      "<input name='pass' type='password' style='width:100%;padding:8px'>"
      "<br><br><button type='submit' style='padding:10px 20px'>Connect</button>"
      "</form></body></html>";
  server.send(200, "text/html", html);
}

void handleSave() {
  saveNetwork(server.arg("ssid"), server.arg("pass"));
  server.send(200, "text/html",
              "<html><body style='font-family:sans-serif;padding:16px'>"
              "<h3>Saved.</h3><p>The device will now try to connect. "
              "If the PalayGuard-Setup network appears again, the password was "
              "wrong.</p>"
              "</body></html>");
  portalSaved = true;
}

void runPortal(unsigned long timeoutMs) {
  WiFi.mode(WIFI_STA);
  int n = WiFi.scanNetworks();
  networkOptions = "";
  for (int i = 0; i < n; i++) {
    String name = htmlEscape(WiFi.SSID(i));
    if (name.length() == 0)
      continue;
    if (networkOptions.indexOf("<option>" + name + "</option>") >= 0)
      continue;
    networkOptions += "<option>" + name + "</option>";
  }

  portalSaved = false;
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("PalayGuard-Setup"); // open hotspot, no password
  server.on("/", handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.begin();
  Serial.println("Setup hotspot: PalayGuard-Setup -> open http://192.168.4.1");

  unsigned long start = millis();
  while (!portalSaved && millis() - start < timeoutMs) {
    server.handleClient();
    delay(5);
  }
  server.stop();
  WiFi.softAPdisconnect(true);

  if (portalSaved) {
    delay(1500);   // let the confirmation page reach the phone
    ESP.restart(); // reboot and connect with the new network
  }
}

// ------------------------------------------------------------
// Connect: saved network first, then the setup option
// ------------------------------------------------------------
bool connectWifi() {
  WiFi.mode(WIFI_STA);
  bool ok = trySaved();
  if (!ok) {
    if (TEST_MODE) {
      ok = chooseNetwork(); // Serial menu when plugged in
    } else {
      runPortal(PORTAL_TIMEOUT_MS); // phone setup page in the field
      ok = (WiFi.status() == WL_CONNECTED);
    }
  }
  if (ok) {
    Serial.printf("WiFi OK | IP %s | gateway %s | RSSI %d dBm\n",
                  WiFi.localIP().toString().c_str(),
                  WiFi.gatewayIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("WiFi failed");
  }
  return ok;
}

// Test mode: type 'w' within 5 s of boot to forget the network and re-pick
void offerNetworkReset() {
  Serial.println(
      "\nSend 'w' within 5 s to forget the saved Wi-Fi and pick a new one.");
  unsigned long start = millis();
  while (millis() - start < 5000) {
    if (Serial.available() && (char)Serial.read() == 'w') {
      forgetNetwork();
      chooseNetwork();
      return;
    }
    delay(10);
  }
}

// Field mode: hold the BOOT button in the first 5 s after power-up
void checkClearButton() {
  if (esp_sleep_get_wakeup_cause() != ESP_SLEEP_WAKEUP_UNDEFINED)
    return; // skip timer wakeups
  pinMode(CLEAR_BTN, INPUT_PULLUP);
  Serial.println("Hold the BOOT button now (5 s) to forget the saved Wi-Fi...");
  unsigned long start = millis();
  while (millis() - start < 5000) {
    if (digitalRead(CLEAR_BTN) == LOW) {
      forgetNetwork();
      delay(1000);
      return;
    }
    delay(20);
  }
}

// ------------------------------------------------------------
// Sensor
// ------------------------------------------------------------
int readMoisture() {
  pinMode(POWER_PIN, OUTPUT);
  digitalWrite(POWER_PIN, HIGH);
  delay(300); // let the sensor settle

  int rawA0 = analogRead(A0);
  int mvA0 = analogReadMilliVolts(A0);

  long sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(SENSOR_PIN);
    delay(10);
  }
  digitalWrite(POWER_PIN, LOW);
  int raw = sum / 16;

  int moisture = 0;
  if (DRY_VAL != WET_VAL) {
    moisture = constrain(map(raw, DRY_VAL, WET_VAL, 0, 100), 0, 100);
  }

  Serial.printf("Raw ADC: %d (Voltage: %d mV) | Moisture: %d%%\n", raw, mvA0,
                moisture);
  if (raw <= 15) {
    Serial.println(
        "  -> [NOTE] Raw is ~0! If your sensor is connected to 3.3V/5V instead "
        "of D1, or plugged into a different pin, check wiring.");
  }
  return moisture;
}

// ------------------------------------------------------------
// Backend
// ------------------------------------------------------------
bool sendData(int moisture) {
  String body = "{\"moisture\":" + String(moisture) +
                ",\"sensor_id\":" + String(SENSOR_ID) + "}";
  HTTPClient http;
  http.setTimeout(USE_HTTPS ? 20000 : 8000);

  String url;
  int code = 0;

  if (USE_HTTPS) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // encrypts, but does not verify the server
    url = String("https://") + HOST + "/api/sensors/data";
    http.begin(secureClient, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);
    Serial.println("POST " + url);
    code = http.POST(body);
  } else {
    WiFiClient plainClient;
    url = String("http://") + HOST + ":" + PORT + "/api/sensors/data";
    http.begin(plainClient, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);
    Serial.println("POST " + url);
    code = http.POST(body);
  }

  if (code < 0) {
    Serial.printf("HTTP error: %d (%s)\n", code,
                  HTTPClient::errorToString(code).c_str());
  } else {
    Serial.printf("HTTP status: %d\n", code);
    String response = http.getString();
    if (response.length() > 0) {
      Serial.println("Response: " + response);
    }
  }
  http.end();
  return code >= 200 && code < 300;
}

bool runCycle() {
  int moisture = readMoisture();
  if (WiFi.status() != WL_CONNECTED && !connectWifi())
    return false;
  bool ok = sendData(moisture);
  Serial.println(ok ? ">> SUCCESS: data sent" : "!! Send failed");
  return ok;
}

void goToSleep(int minutes) {
  WiFi.disconnect(true);
  Serial.printf("Sleeping %d min\n", minutes);
  Serial.flush();
  esp_sleep_enable_timer_wakeup(minutes * 60ULL * 1000000ULL);
  esp_deep_sleep_start();
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("\nPalayGuard starting...");

  pinMode(POWER_PIN, OUTPUT);
  digitalWrite(POWER_PIN, LOW);
  analogReadResolution(12);

#if defined(ADC_ATTEN_DB_12)
  analogSetAttenuation(ADC_ATTEN_DB_12);
#elif defined(ADC_ATTEN_DB_11)
  analogSetAttenuation(ADC_ATTEN_DB_11);
#else
  analogSetAttenuation(ADC_11db);
#endif

  WiFi.persistent(
      false); // don't let the Wi-Fi library keep its own saved network
  WiFi.mode(WIFI_STA);

  checkClearButton();

  if (TEST_MODE) {
    offerNetworkReset();
  } else {
    bool ok = runCycle();
    goToSleep(ok ? SLEEP_MIN : RETRY_MIN);
  }
}

void loop() { // only reached in TEST_MODE
  Serial.println("\n--- Field Update ---");
  runCycle();
  delay(TEST_INTERVAL_S * 1000UL);
}
